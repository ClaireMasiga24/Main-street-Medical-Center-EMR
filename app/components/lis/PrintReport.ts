import type { ResultEntry, PrintLayoutConfig } from "../../lib/lab-config/types";

/**
 * Generate the full HTML for a printable lab report.
 * Opens in a new window with a print dialog.
 */
export function generateLabReportHTML(
  patientName: string,
  patientNumber: string,
  gender: string,
  age: number,
  testName: string,
  specimenType: string | null,
  specimenId: string | null,
  specimenCollectedAt: string | null,
  requestedBy: string,
  results: ResultEntry[],
  enteredByName: string | null,
  validatedByName: string | null,
  printLayout?: PrintLayoutConfig,
) {
  const now = new Date().toLocaleString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const cols = specimenCollectedAt
    ? new Date(specimenCollectedAt).toLocaleDateString("en-UG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "\u2014";
  const colTime = specimenCollectedAt
    ? new Date(specimenCollectedAt).toLocaleTimeString("en-UG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "\u2014";
  const wbcDifferentialIdx = printLayout?.wbcDifferentialStartIndex;

  const rowsHtml = results
    .map((r, i) => {
      let flagColor = "";
      let flagBg = "";
      if (r.flag === "HIGH") {
        flagColor = "color:#dc2626;font-weight:700;";
        flagBg = "background:#fef2f2;";
      } else if (r.flag === "LOW") {
        flagColor = "color:#d97706;font-weight:700;";
        flagBg = "background:#fffbeb;";
      } else if (r.flag === "NORMAL") {
        flagColor = "color:#16a34a;";
      }
      const flagDisplay = r.result.trim() ? r.flag : "";
      // Insert WBC Differential section header dynamically from printLayout config
      const sectionHeader =
        wbcDifferentialIdx !== undefined && i === wbcDifferentialIdx
          ? `<tr style="background:#f3f4f6;"><td colspan="6" style="padding:5px 8px;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-top:2px solid #d1d5db;border-bottom:1px solid #e5e7eb;">&nbsp;&nbsp;WBC DIFFERENTIAL (3-PART)</td></tr>`
          : "";
      return `${sectionHeader}<tr style="${flagBg}border-bottom:1px solid #e5e7eb;">
      <td style="padding:6px 8px;font-size:11px;color:#374151;">${i + 1}</td>
      <td style="padding:6px 8px;font-size:11px;color:#111827;font-weight:500;">${r.test}</td>
      <td style="padding:6px 8px;font-size:11px;color:#111827;font-weight:600;text-align:center;">${r.result || "\u2014"}</td>
      <td style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:center;">${r.unit}</td>
      <td style="padding:6px 8px;font-size:10px;color:#6b7280;font-family:monospace;text-align:center;">${r.referenceRange}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;${flagColor}">${flagDisplay}</td>
    </tr>`;
    })
    .join("");

  // Find flagged rows for interpretation
  const flagged = results.filter(
    (r) => r.flag === "HIGH" || r.flag === "LOW"
  );
  const interpretationHtml =
    flagged.length > 0
      ? `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;color:#111827;margin:0 0 4px 0;">Remarks / Interpretation:</p>
        <p style="font-size:11px;color:#374151;margin:0;line-height:1.5;">
          Abnormal results detected: ${flagged
            .map((r) => `${r.test} (${r.result}, ${r.flag})`)
            .join("; ")}.
          Clinical correlation advised.
        </p>
       </div>`
      : `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;color:#111827;margin:0 0 4px 0;">Remarks / Interpretation:</p>
        <p style="font-size:11px;color:#6b7280;margin:0;font-style:italic;">No remarks.</p>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report - ${patientName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: url('/Images/LOGO.jpg') center / 50% no-repeat;
    opacity: 0.07;
    pointer-events: none;
    z-index: -1;
  }
  .watermark-fixed {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    width: 60%;
    opacity: 0.07;
    z-index: -1;
    pointer-events: none;
  }
  @page { size: A4; margin: 15mm; }
  @media print {
    body { margin:0; padding:0; }
    .screen-only { display:none !important; }
    .report-content { display:block !important; }
  }
  @media screen {
    .report-content { display:none; }
  }
</style>
</head>
<body>
  <img src="/Images/LOGO.jpg" alt="" class="watermark-fixed" />
  <div class="screen-only" style="text-align:center;padding:40px 20px;">
    <button onclick="window.print()" style="background:#00703C;color:#fff;border:none;padding:12px 32px;font-size:16px;font-weight:600;border-radius:8px;cursor:pointer;">Click here to print</button>
    <p style="margin-top:12px;font-size:13px;color:#6b7280;">If the print dialog does not open automatically, click the button above.</p>
  </div>
  <div class="report-content">
    <!-- Facility header -->
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:20px;font-weight:800;color:#00703C;letter-spacing:1px;margin:0;">MAIN STREET MEDICAL CENTER</h1>
      <p style="font-size:11px;color:#4b5563;margin:2px 0 0 0;">P.O BOX 154293, Seeta, Uganda</p>
      <p style="font-size:10px;color:#9ca3af;margin:2px 0 0 0;">Laboratory Report</p>
    </div>
    <hr style="border:none;border-top:2px solid #00703C;margin-bottom:16px;" />
    <!-- Patient details -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="width:50%;padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Patient Name:</span><br/>
          <span style="color:#111827;font-weight:500;">${patientName}</span>
        </td>
        <td style="width:50%;padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Lab ID:</span><br/>
          <span style="color:#111827;font-weight:500;">${specimenId || "\u2014"}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Gender / Age:</span><br/>
          <span style="color:#111827;font-weight:500;">${gender} / ${age} years</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Specimen Type:</span><br/>
          <span style="color:#111827;font-weight:500;">${specimenType || "\u2014"}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Date of Collection:</span><br/>
          <span style="color:#111827;font-weight:500;">${cols}</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Time:</span><br/>
          <span style="color:#111827;font-weight:500;">${colTime}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Requested By:</span><br/>
          <span style="color:#111827;font-weight:500;">${requestedBy}</span>
        </td>
        <td style="padding:3px 8px;font-size:11px;vertical-align:top;">
          <span style="color:#6b7280;font-weight:600;">Test:</span><br/>
          <span style="color:#111827;font-weight:500;">${testName}</span>
        </td>
      </tr>
    </table>
    <!-- Results table -->
    <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;">
      <thead>
        <tr style="background:#00703C;color:#fff;">
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px;">#</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:left;letter-spacing:0.5px;">Parameter</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Result</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Units</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Reference Range</th>
          <th style="padding:7px 8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:0.5px;">Flag</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    ${interpretationHtml}
    <hr style="border:none;border-top:1px solid #d1d5db;margin:24px 0 16px 0;" />
    <!-- Signature lines -->
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding:4px 8px;vertical-align:top;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;margin:0 0 2px 0;">Lab Technician</p>
          <p style="font-size:11px;color:#111827;font-weight:500;margin:0;border-bottom:1px solid #374151;display:inline-block;min-width:180px;padding-bottom:4px;">${enteredByName || "\u2014"}</p>
          <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">Signature</p>
        </td>
        <td style="width:50%;padding:4px 8px;vertical-align:top;">
          <p style="font-size:11px;color:#6b7280;font-weight:600;margin:0 0 2px 0;">Authorized By</p>
          <p style="font-size:11px;color:#111827;font-weight:500;margin:0;border-bottom:1px solid #374151;display:inline-block;min-width:180px;padding-bottom:4px;">${validatedByName || "\u2014"}</p>
          <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">Signature</p>
        </td>
      </tr>
    </table>
    <p style="font-size:8px;color:#9ca3af;text-align:center;margin-top:16px;">Printed: ${now} &bull; Main Street Medical Center Laboratory</p>
  </div>
  <script>
    (function(){ try { setTimeout(function(){ window.print(); }, 500); } catch(e) {} })();
  </script>
</body>
</html>`;
}
