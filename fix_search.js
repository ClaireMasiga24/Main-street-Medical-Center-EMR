const fs = require("fs");
const path = "app/nurse_midwife/page.tsx";
let content = fs.readFileSync(path, "utf8");

// Replace the closing of the drugs.map IIFE - it's the one right before Pagination
// The pattern: the })} that appears just before {/* Pagination */}
const oldStr = `                    })}\r\n\r\n\r\n\r\n\r\n\r\n                    {/* Pagination */}`;
const newStr = `                    }); })()}\r\n\r\n\r\n\r\n\r\n\r\n                    {/* Pagination */}`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(path, content, "utf8");
  console.log("Replaced successfully");
} else {
  console.log("Pattern not found");
  // Debug context
  const idx = content.indexOf("Pagination */}");
  if (idx >= 0) {
    console.log("Before Pagination:", JSON.stringify(content.substring(idx - 80, idx)));
  }
}
