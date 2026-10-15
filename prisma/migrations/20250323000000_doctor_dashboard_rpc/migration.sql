-- ════════════════════════════════════════════════════════════════════════════
-- Doctor dashboard: one round trip instead of seven
-- ════════════════════════════════════════════════════════════════════════════
--
-- GET /api/doctor/dashboard used to fan out into 6-8 separate statements: the
-- queue, "sent away, not finished", the seven stat counts, the last 24h of
-- notifications, the orphan probe, the per-patient lab/imaging/appointment
-- roll-up, and finally the orphan detail fetch. The database is a long way
-- from Kampala, so each of those statements costs ~1.3s of pure network
-- latency — 8-10s per poll, which is what made the screen time out.
--
-- doctor_dashboard() returns the whole payload as a single jsonb document, so
-- the same data costs exactly one round trip.
--
-- Predicates, ordering and JSON field names are copied verbatim from the
-- previous TypeScript implementation, which now lives in
-- app/api/doctor/dashboard/legacy.ts and is still used as the fallback for a
-- deploy that lands before this migration has been applied. The response shape
-- the UI consumes is therefore unchanged.
--
-- Notes:
--   * STABLE + read-only, so the whole body sees one snapshot. No temp tables,
--     no session state, no SET, no transaction control — safe under pgBouncer
--     transaction pooling, which is what DATABASE_URL points at.
--   * Prisma writes every DateTime as `timestamp(3)` holding UTC wall-clock
--     (see prisma/schema.prisma and the earlier migrations). Every "now" below
--     is therefore derived from now() AT TIME ZONE 'UTC' and every timestamp is
--     emitted with an explicit trailing Z, so the JSON matches what
--     `date.toISOString()` used to produce regardless of the session TimeZone.
--   * `to_char(NULL, ...)` returns NULL, so the nullable timestamps come out as
--     JSON null without any extra branching.
--
-- Idempotent: safe to re-run. You can paste this whole file into the Supabase
-- SQL editor, or run `npx prisma migrate deploy`.

CREATE OR REPLACE FUNCTION public.doctor_dashboard(
  p_doctor_id integer DEFAULT NULL,
  p_status    text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $doctor_dashboard$
DECLARE
  v_now          timestamp;
  v_today        timestamp;
  v_today_end    timestamp;
  v_since_24h    timestamp;

  -- Encounter.currentStatus values the queue accepts. Encounter.currentStatus
  -- is plain text; Patient.currentStatus is the PatientStatus enum, so it gets
  -- its own array rather than an array cast that would drop the index on
  -- Patient(currentStatus).
  v_statuses     text[];
  v_statuses_enum public."PatientStatus"[];

  -- Departments that can hand an encounter back to the doctor. Mirrors
  -- AWAITING_RETURN_DEPTS in app/lib/encounterUtils.ts. CASHIER is deliberately
  -- absent: routing to the cashier is what "Finish Consultation" does, so
  -- anything sitting there has already been finished.
  v_return_depts text[] := ARRAY[
    'LAB', 'LABORATORY', 'SONOGRAPHY', 'RADIOLOGY',
    'NURSE', 'NURSE_MIDWIFE', 'PHARMACY', 'DENTIST'
  ];

  -- 500 is the queue cap the route applied after the DB read. The encounter id
  -- and the patient id are collected together (in the same order) because the
  -- two are needed in different places: the queue itself is keyed by encounter,
  -- while the orphan probe and the per-patient roll-up are keyed by patient.
  v_queue_ids          integer[] := ARRAY[]::integer[];
  v_queue_patient_ids  integer[] := ARRAY[]::integer[];
  v_orphan_ids         integer[] := ARRAY[]::integer[];
  v_ret_ids            integer[] := ARRAY[]::integer[];
  v_ret_patient_ids    integer[] := ARRAY[]::integer[];
  v_scope_patient_ids  integer[] := ARRAY[]::integer[];

  v_truncated    boolean := false;
  v_patients     jsonb := '[]'::jsonb;
  v_awaiting     jsonb := '[]'::jsonb;
  v_metrics      jsonb;
  v_updates      jsonb;

  -- ISO-8601 with milliseconds and a literal Z, i.e. exactly what
  -- JS `new Date(x).toISOString()` produced before this function existed.
  iso_fmt CONSTANT text := 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
BEGIN
  v_now       := (now() AT TIME ZONE 'UTC');
  v_today     := date_trunc('day', v_now);
  v_today_end := v_today + interval '1 day';
  v_since_24h := v_now - interval '24 hours';

  v_statuses := CASE
    WHEN p_status IS NULL OR p_status = ''
      THEN ARRAY['AWAITING_DOCTOR', 'IN_CONSULTATION']
    ELSE ARRAY[p_status]
  END;

  v_statuses_enum := CASE
    WHEN p_status IS NULL OR p_status = ''
      THEN ARRAY['AWAITING_DOCTOR', 'IN_CONSULTATION']::public."PatientStatus"[]
    ELSE ARRAY[(p_status)::public."PatientStatus"]
  END;

  -- ── 1. The doctor's live queue ───────────────────────────────────────────
  -- Ordering is the final render order: patients the doctor registered
  -- themselves first, then emergencies, then most-recently-updated. The old
  -- code read `ORDER BY isEmergency DESC, updatedAt DESC` and then re-sorted
  -- Doctor Registration to the front in JS; folding that into the ORDER BY
  -- gives the same list without a second pass.
  SELECT COALESCE(array_agg(id), ARRAY[]::integer[]),
         COALESCE(array_agg(patient_id), ARRAY[]::integer[])
    INTO v_queue_ids, v_queue_patient_ids
    FROM (
      SELECT e.id, e."patientId" AS patient_id
        FROM "Encounter" e
       WHERE e."currentOwnerDept" = 'DOCTOR'
         AND e."currentStatus" = ANY (v_statuses)
         AND e.status = 'ACTIVE'
       ORDER BY (e.source = 'Doctor Registration') DESC,
                e."isEmergency" DESC,
                e."updatedAt" DESC
       LIMIT 501
    ) q;

  v_truncated := COALESCE(array_length(v_queue_ids, 1), 0) > 500;
  IF v_truncated THEN
    v_queue_ids         := v_queue_ids[1:500];
    v_queue_patient_ids := v_queue_patient_ids[1:500];
  END IF;

  IF COALESCE(array_length(v_queue_ids, 1), 0) > 0 THEN

    -- ── 2. Orphan safety net ───────────────────────────────────────────────
    -- A patient can be flagged as the doctor's on the Patient row while their
    -- encounter was never routed back (e.g. a lab request created without an
    -- encounterId — the lab's "return to doctor" step then has nothing to
    -- move). Without this they are silently invisible, because the encounter
    -- query above returns rows.
    SELECT COALESCE(array_agg(p.id ORDER BY p."isEmergency" DESC, p."updatedAt" ASC), ARRAY[]::integer[])
      INTO v_orphan_ids
      FROM "Patient" p
     WHERE p."currentStatus" = ANY (v_statuses_enum)
       AND p.id <> ALL (v_queue_patient_ids);

    -- ── 3. Sent away, not finished ─────────────────────────────────────────
    -- An encounter the doctor opened (it carries a ClinicalNote) that is now
    -- sitting with a department that can hand it back.
    SELECT COALESCE(array_agg(id), ARRAY[]::integer[]),
           COALESCE(array_agg(patient_id), ARRAY[]::integer[])
      INTO v_ret_ids, v_ret_patient_ids
      FROM (
        SELECT e.id, e."patientId" AS patient_id
          FROM "Encounter" e
         WHERE e.status = 'ACTIVE'
           AND e."currentOwnerDept" = ANY (v_return_depts)
           AND EXISTS (SELECT 1 FROM "ClinicalNote" c WHERE c."encounterId" = e.id)
         ORDER BY e."updatedAt" ASC
         LIMIT 25
      ) r;

    v_scope_patient_ids := v_queue_patient_ids || v_orphan_ids || v_ret_patient_ids;

    -- ── 4. Patients + "sent away" rows, in one statement ───────────────────
    -- `extras` is the grouped per-patient roll-up that replaced three nested
    -- Prisma includes (the single most valuable part of the rewrite: it was
    -- three extra round trips per poll, each with a `take: 5` that could only
    -- ever produce the number 5).
    SELECT s.agg_patients, s.agg_awaiting
      INTO v_patients, v_awaiting
      FROM (
        WITH scope AS (
          SELECT unnest(v_scope_patient_ids) AS patient_id
        ),
        extras AS (
          SELECT sc.patient_id,
                 COALESCE(SUM(u.labs), 0)::int    AS labs,
                 COALESCE(SUM(u.imaging), 0)::int AS imaging,
                 MIN(u.appt)                      AS appt
            FROM scope sc
            LEFT JOIN (
              SELECT l."patientId" AS patient_id, 1 AS labs, 0 AS imaging, NULL::timestamp AS appt
                FROM "LabRequest" l
               WHERE l."patientId" = ANY (v_scope_patient_ids)
                 AND l.status <> 'COMPLETED'
              UNION ALL
              SELECT i."patientId", 0, 1, NULL::timestamp
                FROM "ImagingRequest" i
               WHERE i."patientId" = ANY (v_scope_patient_ids)
                 AND i.status NOT IN ('REPORTED', 'CANCELLED')
              UNION ALL
              SELECT a."patientId", 0, 0, a."appointmentDate"
                FROM "Appointment" a
               WHERE a."patientId" = ANY (v_scope_patient_ids)
                 AND a.department = 'Doctor'
                 AND a."appointmentDate" >= v_today
                 AND a."appointmentDate" < v_today_end
            ) u ON u.patient_id = sc.patient_id
           GROUP BY sc.patient_id
        ),

        -- Queue rows.
        q_raw AS (
          SELECT o.ord,
                 p.id                          AS patient_id,
                 o.enc_id                      AS enc_id,
                 e."isEmergency"               AS is_emergency,
                 e."currentStatus"             AS current_status,
                 e."lastSharedFromDept"        AS last_shared,
                 e."updatedAt"                 AS updated_at,
                 e.source                      AS source,
                 p."patientNumber"             AS patient_number,
                 p."firstName"                 AS first_name,
                 p."lastName"                  AS last_name,
                 p.gender                      AS gender,
                 p.age                         AS age,
                 p."phoneNumber"               AS phone_number,
                 COALESCE(e."chiefComplaint", t."chiefComplaint", vv.symptoms, '') AS complaint,
                 COALESCE(e."esiLevel", t."esiLevel")                              AS esi,
                 COALESCE(e."triageCompletedAt", t."createdAt")                    AS triage_at,
                 COALESCE(x.labs, 0)           AS labs,
                 COALESCE(x.imaging, 0)        AS imaging,
                 x.appt                        AS appt
            FROM unnest(v_queue_ids) WITH ORDINALITY AS o(enc_id, ord)
            JOIN "Encounter" e ON e.id = o.enc_id
            JOIN "Patient" p ON p.id = e."patientId"
            LEFT JOIN extras x ON x.patient_id = p.id
            LEFT JOIN LATERAL (
              SELECT tt."chiefComplaint", tt."esiLevel", tt."createdAt"
                FROM "Triage" tt
               WHERE tt."patientId" = p.id
               ORDER BY tt."createdAt" DESC
               LIMIT 1
            ) t ON TRUE
            LEFT JOIN LATERAL (
              SELECT vv2.symptoms
                FROM "Visit" vv2
               WHERE vv2."patientId" = p.id
               ORDER BY vv2."createdAt" DESC
               LIMIT 1
            ) vv ON TRUE
        ),

        -- Orphan rows. Same shape, but they have no encounter in the queue, so
        -- the latest ACTIVE encounter is looked up directly and their `source`
        -- is inferred from the Patient row instead of the encounter.
        o_raw AS (
          SELECT (1000000 + o.ord)            AS ord,
                 p.id                          AS patient_id,
                 COALESCE(ae.id, 0)            AS enc_id,
                 p."isEmergency"               AS is_emergency,
                 -- Encounter.currentStatus is text, Patient.currentStatus is the
                 -- PatientStatus enum; cast so the two branches of the UNION
                 -- below agree. Safe: this is an output column, not a filter,
                 -- so the index on Patient(currentStatus) is unaffected.
                 p."currentStatus"::text       AS current_status,
                 p."lastSharedFromDept"        AS last_shared,
                 p."updatedAt"                 AS updated_at,
                 CASE
                   WHEN p."isEmergency" THEN 'Emergency'
                   WHEN p."lastSharedFromDept" IS NULL OR p."lastSharedFromDept" = '' THEN 'Triage'
                   ELSE COALESCE(
                          CASE p."lastSharedFromDept"
                            WHEN 'Lab' THEN 'Lab Referral'
                            WHEN 'Lab Referral' THEN 'Lab Referral'
                            WHEN 'Radiology' THEN 'Radiology Referral'
                            WHEN 'Sonography' THEN 'Sonography Referral'
                            WHEN 'Dentist' THEN 'Dentist Referral'
                            WHEN 'Nurse/Midwife' THEN 'Nurse Referral'
                            WHEN 'Nurse' THEN 'Nurse Referral'
                          END, 'Follow-up')
                 END                           AS source,
                 p."patientNumber"             AS patient_number,
                 p."firstName"                 AS first_name,
                 p."lastName"                  AS last_name,
                 p.gender                      AS gender,
                 p.age                         AS age,
                 p."phoneNumber"               AS phone_number,
                 COALESCE(ae."chiefComplaint", t."chiefComplaint", vv.symptoms, '') AS complaint,
                 COALESCE(ae."esiLevel", t."esiLevel")                              AS esi,
                 COALESCE(ae."triageCompletedAt", t."createdAt")                    AS triage_at,
                 COALESCE(x.labs, 0)           AS labs,
                 COALESCE(x.imaging, 0)        AS imaging,
                 x.appt                        AS appt
            FROM unnest(v_orphan_ids) WITH ORDINALITY AS o(pid, ord)
            JOIN "Patient" p ON p.id = o.pid
            LEFT JOIN extras x ON x.patient_id = p.id
            LEFT JOIN LATERAL (
              SELECT ae2.id, ae2."chiefComplaint", ae2."esiLevel", ae2."triageCompletedAt"
                FROM "Encounter" ae2
               WHERE ae2."patientId" = p.id
                 AND ae2.status = 'ACTIVE'
               ORDER BY ae2."openedAt" DESC
               LIMIT 1
            ) ae ON TRUE
            LEFT JOIN LATERAL (
              SELECT tt."chiefComplaint", tt."esiLevel", tt."createdAt"
                FROM "Triage" tt
               WHERE tt."patientId" = p.id
               ORDER BY tt."createdAt" DESC
               LIMIT 1
            ) t ON TRUE
            LEFT JOIN LATERAL (
              SELECT vv2.symptoms
                FROM "Visit" vv2
               WHERE vv2."patientId" = p.id
               ORDER BY vv2."createdAt" DESC
               LIMIT 1
            ) vv ON TRUE
        ),

        -- Queue rows and orphan rows, before the per-patient collapse.
        qo_all AS (
          SELECT r.ord, r.patient_id, r.enc_id, r.is_emergency, r.current_status,
                 r.last_shared, r.updated_at, r.source, r.patient_number, r.first_name,
                 r.last_name, r.gender, r.age, r.phone_number, r.complaint, r.esi,
                 r.triage_at, r.labs, r.imaging, r.appt,
                 floor(extract(epoch FROM (v_now - r.updated_at)) / 60)::int AS wm
            FROM (SELECT * FROM q_raw UNION ALL SELECT * FROM o_raw) r
        ),

        -- One row per patient. A patient can hold two ACTIVE encounters the
        -- doctor owns — encounters are reused for life, so a repeat
        -- consultation leaves the old row open alongside the new one — and
        -- every number the doctor sees against this list (the "Patient Queue
        -- (n)" heading, the sidebar badge, the Waiting card) measures patients.
        -- Collapsing here is what makes those three the same measurement.
        -- Lowest ord wins, so a queue row beats the orphan row for the same
        -- patient; that cannot happen today, because the orphan probe excludes
        -- v_queue_patient_ids, but the ordering keeps it true if it ever can.
        qo_rows AS (
          SELECT DISTINCT ON (a.patient_id) a.*
            FROM qo_all a
           ORDER BY a.patient_id, a.ord
        ),

        -- Sent-away rows, decorated like the queue rows plus the department
        -- they are sitting in and a coarser "3d 4h" style wait.
        ret_raw AS (
          SELECT o.ord,
                 p.id                          AS patient_id,
                 o.enc_id                      AS enc_id,
                 e."isEmergency"               AS is_emergency,
                 e."currentStatus"             AS current_status,
                 e."currentOwnerDept"          AS owner_dept,
                 e."lastSharedFromDept"        AS last_shared,
                 e."updatedAt"                 AS updated_at,
                 e.source                      AS source,
                 p."patientNumber"             AS patient_number,
                 p."firstName"                 AS first_name,
                 p."lastName"                  AS last_name,
                 p.gender                      AS gender,
                 p.age                         AS age,
                 p."phoneNumber"               AS phone_number,
                 COALESCE(e."chiefComplaint", t."chiefComplaint", vv.symptoms, '') AS complaint,
                 COALESCE(e."esiLevel", t."esiLevel")                              AS esi,
                 COALESCE(e."triageCompletedAt", t."createdAt")                    AS triage_at,
                 COALESCE(x.labs, 0)           AS labs,
                 COALESCE(x.imaging, 0)        AS imaging,
                 x.appt                        AS appt
            FROM unnest(v_ret_ids) WITH ORDINALITY AS o(enc_id, ord)
            JOIN "Encounter" e ON e.id = o.enc_id
            JOIN "Patient" p ON p.id = e."patientId"
            LEFT JOIN extras x ON x.patient_id = p.id
            LEFT JOIN LATERAL (
              SELECT tt."chiefComplaint", tt."esiLevel", tt."createdAt"
                FROM "Triage" tt
               WHERE tt."patientId" = p.id
               ORDER BY tt."createdAt" DESC
               LIMIT 1
            ) t ON TRUE
            LEFT JOIN LATERAL (
              SELECT vv2.symptoms
                FROM "Visit" vv2
               WHERE vv2."patientId" = p.id
               ORDER BY vv2."createdAt" DESC
               LIMIT 1
            ) vv ON TRUE
        ),

        ret_rows AS (
          SELECT r.ord, r.patient_id, r.enc_id, r.is_emergency, r.current_status,
                 r.owner_dept, r.last_shared, r.updated_at, r.source, r.patient_number,
                 r.first_name, r.last_name, r.gender, r.age, r.phone_number,
                 r.complaint, r.esi, r.triage_at, r.labs, r.imaging, r.appt,
                 floor(extract(epoch FROM (v_now - r.updated_at)) / 60)::int AS wm
            FROM ret_raw r
        ),

        patient_json AS (
          SELECT jsonb_agg(
                   jsonb_build_object(
                     'id',                r.patient_id,
                     'encounterId',       r.enc_id,
                     'patientNumber',     r.patient_number,
                     'firstName',         r.first_name,
                     'lastName',          r.last_name,
                     'gender',            r.gender,
                     'age',               r.age,
                     'phoneNumber',       r.phone_number,
                     'isEmergency',       r.is_emergency,
                     'currentStatus',     r.current_status,
                     'lastSharedFromDept', r.last_shared,
                     'updatedAt',         to_char(r.updated_at, iso_fmt),
                     'waitingMinutes',    r.wm,
                     'waitingDisplay',    CASE
                                            WHEN r.wm < 1  THEN 'Just now'
                                            WHEN r.wm < 60 THEN r.wm::text || 'm'
                                            ELSE floor(r.wm / 60.0)::int::text || 'h '
                                                 || (r.wm - 60 * floor(r.wm / 60.0)::int)::text || 'm'
                                          END,
                     'chiefComplaint',    r.complaint,
                     'esiLevel',          r.esi,
                     'triageCompletedAt', to_char(r.triage_at, iso_fmt),
                     'source',            r.source,
                     'pendingLabs',       r.labs,
                     'pendingImaging',    r.imaging,
                     'hasAppointment',    r.appt IS NOT NULL,
                     'appointmentTime',   to_char(r.appt, iso_fmt)
                   )
                   ORDER BY r.ord
                 ) AS agg
            FROM qo_rows r
        ),

        awaiting_json AS (
          SELECT jsonb_agg(
                   jsonb_build_object(
                     'id',                r.patient_id,
                     'encounterId',       r.enc_id,
                     'patientNumber',     r.patient_number,
                     'firstName',         r.first_name,
                     'lastName',          r.last_name,
                     'gender',            r.gender,
                     'age',               r.age,
                     'phoneNumber',       r.phone_number,
                     'isEmergency',       r.is_emergency,
                     'currentStatus',     r.current_status,
                     'lastSharedFromDept', r.last_shared,
                     'updatedAt',         to_char(r.updated_at, iso_fmt),
                     'waitingMinutes',    r.wm,
                     'waitingDisplay',    CASE
                                            WHEN r.wm < 1440 THEN (CASE
                                              WHEN r.wm < 1  THEN 'Just now'
                                              WHEN r.wm < 60 THEN r.wm::text || 'm'
                                              ELSE floor(r.wm / 60.0)::int::text || 'h '
                                                   || (r.wm - 60 * floor(r.wm / 60.0)::int)::text || 'm'
                                            END)
                                            ELSE floor(r.wm / 1440.0)::int::text || 'd '
                                                 || floor((r.wm - 1440 * floor(r.wm / 1440.0)::int) / 60.0)::int::text || 'h'
                                          END,
                     'chiefComplaint',    r.complaint,
                     'esiLevel',          r.esi,
                     'triageCompletedAt', to_char(r.triage_at, iso_fmt),
                     'source',            r.source,
                     'pendingLabs',       r.labs,
                     'pendingImaging',    r.imaging,
                     'hasAppointment',    r.appt IS NOT NULL,
                     'appointmentTime',   to_char(r.appt, iso_fmt),
                     'sentToDept',        r.owner_dept,
                     'sentToLabel',       CASE r.owner_dept
                                            WHEN 'LAB' THEN 'Laboratory'
                                            WHEN 'LABORATORY' THEN 'Laboratory'
                                            WHEN 'SONOGRAPHY' THEN 'Sonography'
                                            WHEN 'RADIOLOGY' THEN 'Radiology'
                                            WHEN 'NURSE' THEN 'Nurse / Midwife'
                                            WHEN 'NURSE_MIDWIFE' THEN 'Nurse / Midwife'
                                            WHEN 'PHARMACY' THEN 'Pharmacy'
                                            WHEN 'DENTIST' THEN 'Dentist'
                                            ELSE r.owner_dept
                                          END,
                     'sentSince',         to_char(r.updated_at, iso_fmt)
                   )
                   ORDER BY r.ord
                 ) AS agg
            FROM ret_rows r
        )

        SELECT COALESCE((SELECT agg FROM patient_json), '[]'::jsonb)  AS agg_patients,
               COALESCE((SELECT agg FROM awaiting_json), '[]'::jsonb) AS agg_awaiting
      ) s;

    -- ── 5. Stat counts ─────────────────────────────────────────────────────
    -- Same seven predicates as the original seven count() calls, in one
    -- statement, with one deliberate exception: awaitingDoctor is no longer a
    -- count over "Encounter" but the length of the queue built in step 4, so
    -- the Waiting card can never disagree with the list under it. See the note
    -- on that key below. The 15s in-process cache the route kept around these
    -- is gone: they now ride along in this same round trip, so caching them
    -- bought nothing but staleness.
    SELECT jsonb_build_object(
             -- "Waiting" is read off the queue the doctor is actually looking
             -- at, not counted from the encounters behind it. A COUNT over
             -- "Encounter" cannot see the orphan patients — a Patient flagged
             -- as the doctor's whose encounter was never routed back, e.g. a
             -- lab referral created without an encounterId — who reach the
             -- queue through the safety net in step 2. That is exactly how the
             -- card came to read 2 next to a three-patient queue.
             'awaitingDoctor',    COALESCE(jsonb_array_length(v_patients), 0),
             'inConsultation',    (SELECT COUNT(*) FROM "Encounter"
                                    WHERE "currentOwnerDept" = 'DOCTOR'
                                      AND "currentStatus" = 'IN_CONSULTATION'
                                      AND "status" = 'ACTIVE'),
             'completedToday',    (SELECT COUNT(*) FROM "Visit"
                                    WHERE "createdAt" >= v_today AND "createdAt" < v_today_end
                                      AND "diagnosis" IS NOT NULL
                                      AND (p_doctor_id IS NULL OR "doctorId" = p_doctor_id)),
             'pendingLabs',       (SELECT COUNT(*) FROM "LabRequest" l
                                    WHERE l.status NOT IN ('COMPLETED', 'REJECTED')
                                      AND EXISTS (SELECT 1 FROM "Encounter" e
                                                   WHERE e.id = l."encounterId"
                                                     AND e."currentOwnerDept" = 'DOCTOR'
                                                     AND e.status = 'ACTIVE')),
             'pendingRadiology',  (SELECT COUNT(*) FROM "ImagingRequest" i
                                    WHERE i.status NOT IN ('REPORTED', 'CANCELLED')
                                      AND EXISTS (SELECT 1 FROM "Encounter" e
                                                   WHERE e.id = i."encounterId"
                                                     AND e."currentOwnerDept" = 'DOCTOR'
                                                     AND e.status = 'ACTIVE')),
             'todayAppointments', (SELECT COUNT(*) FROM "Appointment"
                                    WHERE "appointmentDate" >= v_today AND "appointmentDate" < v_today_end
                                      AND "department" = 'Doctor'
                                      AND "status" <> 'CANCELLED'),
             'admittedPatients',  (SELECT COUNT(*) FROM "Patient"
                                    WHERE "currentStatus" = 'ADMITTED')
           )
      INTO v_metrics;

  ELSE
    -- ── Fallback branch ────────────────────────────────────────────────────
    -- No ACTIVE encounter is queued for the doctor, so this is either a fresh
    -- install or legacy data that predates the Encounter table. The original
    -- route handled this with a Patient-based query and — importantly —
    -- returned an empty awaitingReturn and truncated: false, which is
    -- preserved here.
    SELECT s.agg_patients
      INTO v_patients
      FROM (
        WITH fb AS (
          SELECT p.*
            FROM "Patient" p
           WHERE p."currentStatus" = ANY (v_statuses_enum)
           ORDER BY p."isEmergency" DESC, p."updatedAt" ASC
           LIMIT 500
        ),
        -- `take: 5` on the old LabRequest/ImagingRequest includes capped the
        -- badge at 5, so LEAST(..., 5) is preserved rather than fixed.
        extras AS (
          SELECT sc.patient_id,
                 LEAST(COALESCE(SUM(u.labs), 0), 5)::int    AS labs,
                 LEAST(COALESCE(SUM(u.imaging), 0), 5)::int AS imaging,
                 MIN(u.appt)                                AS appt
            FROM (SELECT id AS patient_id FROM fb) sc
            LEFT JOIN (
              SELECT l."patientId" AS patient_id, 1 AS labs, 0 AS imaging, NULL::timestamp AS appt
                FROM "LabRequest" l
               WHERE l."patientId" IN (SELECT id FROM fb)
                 AND l.status <> 'COMPLETED'
              UNION ALL
              SELECT i."patientId", 0, 1, NULL::timestamp
                FROM "ImagingRequest" i
               WHERE i."patientId" IN (SELECT id FROM fb)
                 AND i.status NOT IN ('REPORTED', 'CANCELLED')
              UNION ALL
              SELECT a."patientId", 0, 0, a."appointmentDate"
                FROM "Appointment" a
               WHERE a."patientId" IN (SELECT id FROM fb)
                 AND a.department = 'Doctor'
                 AND a."appointmentDate" >= v_today
                 AND a."appointmentDate" < v_today_end
            ) u ON u.patient_id = sc.patient_id
           GROUP BY sc.patient_id
        ),
        fbx AS (
          SELECT p.id, p."patientNumber", p."firstName", p."lastName", p.gender, p.age,
                 p."phoneNumber", p."isEmergency", p."currentStatus", p."lastSharedFromDept",
                 p."updatedAt",
                 COALESCE(x.labs, 0)    AS labs,
                 COALESCE(x.imaging, 0) AS imaging,
                 x.appt                 AS appt,
                 ae.id                  AS active_enc_id,
                 COALESCE(t."chiefComplaint", vv.symptoms, '') AS complaint,
                 t."esiLevel"           AS triage_esi,
                 t."createdAt"          AS triage_at,
                 floor(extract(epoch FROM (v_now - p."updatedAt")) / 60)::int AS wm
            FROM fb p
            LEFT JOIN extras x ON x.patient_id = p.id
            LEFT JOIN LATERAL (
              SELECT ae2.id
                FROM "Encounter" ae2
               WHERE ae2."patientId" = p.id
                 AND ae2.status = 'ACTIVE'
               ORDER BY ae2."openedAt" DESC
               LIMIT 1
            ) ae ON TRUE
            LEFT JOIN LATERAL (
              SELECT tt."chiefComplaint", tt."esiLevel", tt."createdAt"
                FROM "Triage" tt
               WHERE tt."patientId" = p.id
               ORDER BY tt."createdAt" DESC
               LIMIT 1
            ) t ON TRUE
            LEFT JOIN LATERAL (
              SELECT vv2.symptoms
                FROM "Visit" vv2
               WHERE vv2."patientId" = p.id
               ORDER BY vv2."createdAt" DESC
               LIMIT 1
            ) vv ON TRUE
        ),
        rows_out AS (
          SELECT row_number() OVER (ORDER BY f."isEmergency" DESC, f."updatedAt" ASC) AS ord,
                 jsonb_build_object(
                   'id',                f.id,
                   'encounterId',       COALESCE(f.active_enc_id, 0),
                   'patientNumber',     f."patientNumber",
                   'firstName',         f."firstName",
                   'lastName',          f."lastName",
                   'gender',            f.gender,
                   'age',               f.age,
                   'phoneNumber',       f."phoneNumber",
                   'isEmergency',       f."isEmergency",
                   'currentStatus',     f."currentStatus",
                   'lastSharedFromDept', f."lastSharedFromDept",
                   'updatedAt',         to_char(f."updatedAt", iso_fmt),
                   'waitingMinutes',    f.wm,
                   'waitingDisplay',    CASE
                                          WHEN f.wm < 1  THEN 'Just now'
                                          WHEN f.wm < 60 THEN f.wm::text || 'm'
                                          ELSE floor(f.wm / 60.0)::int::text || 'h '
                                               || (f.wm - 60 * floor(f.wm / 60.0)::int)::text || 'm'
                                        END,
                   'chiefComplaint',    f.complaint,
                   'esiLevel',          f.triage_esi,
                   'triageCompletedAt', to_char(f.triage_at, iso_fmt),
                   'source',            CASE
                                          WHEN f."isEmergency" THEN 'Emergency'
                                          WHEN f."lastSharedFromDept" IS NULL OR f."lastSharedFromDept" = '' THEN 'Triage'
                                          ELSE COALESCE(
                                                 CASE f."lastSharedFromDept"
                                                   WHEN 'Lab' THEN 'Lab Referral'
                                                   WHEN 'Lab Referral' THEN 'Lab Referral'
                                                   WHEN 'Radiology' THEN 'Radiology Referral'
                                                   WHEN 'Sonography' THEN 'Sonography Referral'
                                                   WHEN 'Dentist' THEN 'Dentist Referral'
                                                   WHEN 'Nurse/Midwife' THEN 'Nurse Referral'
                                                   WHEN 'Nurse' THEN 'Nurse Referral'
                                                 END, 'Follow-up')
                                        END,
                   'pendingLabs',       f.labs,
                   'pendingImaging',    f.imaging,
                   'hasAppointment',    f.appt IS NOT NULL,
                   'appointmentTime',   to_char(f.appt, iso_fmt)
                 ) AS row
            FROM fbx f
        )
        SELECT COALESCE((SELECT jsonb_agg(row ORDER BY ord) FROM rows_out), '[]'::jsonb) AS agg_patients
      ) s;

    v_awaiting := '[]'::jsonb;
    v_truncated := false;

    -- The fallback counts ask different questions from the encounter counts:
    -- they count Patient rows rather than Encounter rows, and pending labs /
    -- imaging are scoped through the Patient's currentStatus. Copied verbatim
    -- from the original fallback branch, except awaitingDoctor — which follows
    -- the same rule as the encounter branch above and is the length of the list
    -- this branch returns.
    SELECT jsonb_build_object(
             'awaitingDoctor',    COALESCE(jsonb_array_length(v_patients), 0),
             'inConsultation',    (SELECT COUNT(*) FROM "Patient" WHERE "currentStatus" = 'IN_CONSULTATION'),
             'completedToday',    (SELECT COUNT(*) FROM "Visit"
                                    WHERE "createdAt" >= v_today AND "createdAt" < v_today_end
                                      AND "diagnosis" IS NOT NULL
                                      AND (p_doctor_id IS NULL OR "doctorId" = p_doctor_id)),
             'pendingLabs',       (SELECT COUNT(*) FROM "LabRequest" l
                                    WHERE l.status NOT IN ('COMPLETED', 'REJECTED')
                                      AND EXISTS (SELECT 1 FROM "Patient" p
                                                   WHERE p.id = l."patientId"
                                                     AND p."currentStatus" IN ('AWAITING_DOCTOR', 'IN_CONSULTATION'))),
             'pendingRadiology',  (SELECT COUNT(*) FROM "ImagingRequest" i
                                    WHERE i.status NOT IN ('REPORTED', 'CANCELLED')
                                      AND EXISTS (SELECT 1 FROM "Patient" p
                                                   WHERE p.id = i."patientId"
                                                     AND p."currentStatus" IN ('AWAITING_DOCTOR', 'IN_CONSULTATION'))),
             'todayAppointments', (SELECT COUNT(*) FROM "Appointment"
                                    WHERE "appointmentDate" >= v_today AND "appointmentDate" < v_today_end
                                      AND "department" = 'Doctor'
                                      AND "status" <> 'CANCELLED'),
             'admittedPatients',  (SELECT COUNT(*) FROM "Patient" WHERE "currentStatus" = 'ADMITTED')
           )
      INTO v_metrics;
  END IF;

  -- ── 6. Clinical updates ──────────────────────────────────────────────────
  -- The last 24h of notifications addressed to the doctor inbox. `= ANY` on
  -- the legacy spellings rather than an OR chain or an ILIKE, so the
  -- (department, createdAt) b-tree still gets used — notificationDeptWhere()
  -- made exactly that trade in app/lib/departments.ts.
  --
  -- `type`, `referenceId` and `referenceType` are carried through unchanged and
  -- the patient is joined for their name: the Clinical Updates panel uses all
  -- four to decide that a "Lab Results Ready" item is about one specific lab
  -- request, and to open that result when the doctor clicks it. The fallback in
  -- app/api/doctor/dashboard/legacy.ts builds the same fields.
  SELECT COALESCE(jsonb_agg(upd ORDER BY cu."createdAt" DESC), '[]'::jsonb)
    INTO v_updates
    FROM (
      SELECT n."createdAt" AS "createdAt",
             jsonb_build_object(
               'id',            n.id::text,
               'type',          COALESCE(n.type, 'COMMUNICATION'),
               'title',         COALESCE(n.title, 'Update'),
               'message',       COALESCE(n.message, ''),
               'patientName',   COALESCE(regexp_replace(btrim(COALESCE(p."firstName", '') || ' ' || COALESCE(p."lastName", '')), '\s+', ' ', 'g'), ''),
               'patientId',     COALESCE(n."patientId", 0),
               'patientNumber', COALESCE(p."patientNumber", ''),
               'referenceId',   n."referenceId",
               'referenceType', n."referenceType",
               'isRead',        COALESCE(n."isRead", false),
               'timestamp',     to_char(n."createdAt", iso_fmt),
               'severity',      'info'
             ) AS upd
        FROM "Notification" n
        LEFT JOIN "Patient" p ON p.id = n."patientId"
       WHERE n.department = ANY (ARRAY['Doctor', 'DOCTOR'])
         AND n."patientId" IS NOT NULL
         AND n."createdAt" >= v_since_24h
       ORDER BY n."createdAt" DESC
       LIMIT 10
    ) cu;

  RETURN jsonb_build_object(
    'patients',        v_patients,
    'awaitingReturn',  v_awaiting,
    'metrics',         v_metrics,
    'clinicalUpdates', v_updates,
    'truncated',       v_truncated
  );
END;
$doctor_dashboard$;

-- The API connects as the database owner, which always has EXECUTE. Revoking
-- the default PUBLIC grant (and Supabase's anon/authenticated roles, when they
-- exist) keeps this patient-data RPC off the PostgREST surface — otherwise it
-- would be reachable as POST /rest/v1/rpc/doctor_dashboard by anyone holding
-- the anon key. Guarded by pg_roles checks so the file also runs against a
-- plain PostgreSQL without those roles.
DO $revoke$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.doctor_dashboard(integer, text) FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.doctor_dashboard(integer, text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.doctor_dashboard(integer, text) FROM authenticated';
  END IF;
END;
$revoke$;

-- ════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ════════════════════════════════════════════════════════════════════════════
--
-- The queue and stat queries were already largely indexed by the earlier
-- migrations, and those indexes are what this function still uses:
--
--   Encounter(currentOwnerDept, currentStatus, status)   ← the queue filter
--   Encounter(currentOwnerDept, status, updatedAt)       ← sent-away filter+sort
--   ClinicalNote(encounterId, authorStaffId)             ← the EXISTS probe
--   Triage(patientId, createdAt)                         ← latest triage lateral
--   Visit(patientId, createdAt)                          ← latest visit lateral
--   Visit(doctorId, createdAt)                           ← completedToday
--   Appointment(appointmentDate, department, status)     ← todayAppointments
--   LabRequest(status, encounterId)                      ← pendingLabs
--   ImagingRequest(status, encounterId)                  ← pendingRadiology
--   Patient(currentStatus)                               ← admitted / orphan net
--   Notification(department, createdAt)                  ← clinicalUpdates
--
-- What was genuinely missing is the per-patient side: the lab / imaging /
-- appointment roll-up filtered on patientId and then threw away most of the
-- rows on a status test the index could not see. Adding status (and the
-- appointment's department+date) after patientId turns each of those into an
-- index-only scan instead of a heap fetch per row.
--
-- These are declared in prisma/schema.prisma with the same names via `map:`,
-- so `prisma migrate dev` will not see them as drift.
CREATE INDEX IF NOT EXISTS "idx_labrequest_patient_status"
  ON "LabRequest" ("patientId", "status");

CREATE INDEX IF NOT EXISTS "idx_imagingrequest_patient_status"
  ON "ImagingRequest" ("patientId", "status");

CREATE INDEX IF NOT EXISTS "idx_appointment_patient_dept_date"
  ON "Appointment" ("patientId", "department", "appointmentDate");
