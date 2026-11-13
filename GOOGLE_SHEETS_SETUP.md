# KickStart 2026 — Google Sheets Sync Setup

This setup automatically sends all registration data directly into your Google Sheet in real time, with an automatic **`Paid`** column that displays **`PAID`** (green) or **`NOT PAID`** (red).

---

## Step 1: Open Google Sheets
1. Create a new Google Sheet (or open an existing one).
2. Rename the sheet or tab if desired (e.g., `KickStart Registrations`).

---

## Step 2: Add the Apps Script Code
1. In your Google Sheet, click **Extensions** in the top menu and select **Apps Script**.
2. Delete any default code inside the editor.
3. Paste the following script:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // If sheet is empty, automatically add headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Order ID",
        "Full Name",
        "Roll Number",
        "Department",
        "Year",
        "College Email",
        "Phone Number",
        "Selected Passes",
        "Amount (₹)",
        "Resume / Portfolio",
        "Why KickStart",
        "Paid",
        "Payment UTR / Ref"
      ]);

      // Style header row
      var headerRange = sheet.getRange(1, 1, 1, 14);
      headerRange.setFontWeight("bold")
        .setBackground("#141417")
        .setFontColor("#fafafa")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 1. UPDATE PAYMENT STATUS ACTION
    if (data.action === "UPDATE_PAYMENT") {
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][1] == data.orderId) {
          // Column 13 is "Paid" (1-indexed)
          var paidCell = sheet.getRange(i + 1, 13);
          paidCell.setValue("PAID")
            .setBackground("#dcfce7")
            .setFontColor("#15803d")
            .setFontWeight("bold")
            .setHorizontalAlignment("center");

          if (data.utr) {
            sheet.getRange(i + 1, 14).setValue(data.utr);
          }
          return ContentService.createTextOutput(JSON.stringify({ status: "success", updated: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 2. NEW CANDIDATE REGISTRATION (Default: "NOT PAID")
    var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([
      timestamp,
      data.orderId || "",
      data.fullName || "",
      data.rollNumber || "",
      data.department || "",
      data.year || "",
      data.collegeEmail || "",
      "'" + (data.phone || ""),
      data.selectedTicketNames || "",
      data.amountRupees || 0,
      data.resumeName || "Not uploaded",
      data.whyKickstart || "",
      data.paid || "NOT PAID",
      data.utr || "-"
    ]);

    // Format new row's Paid badge
    var lastRow = sheet.getLastRow();
    var statusCell = sheet.getRange(lastRow, 13);
    if (data.paid === "PAID") {
      statusCell.setValue("PAID")
        .setBackground("#dcfce7")
        .setFontColor("#15803d")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");
    } else {
      statusCell.setValue("NOT PAID")
        .setBackground("#fee2e2")
        .setFontColor("#b91c1c")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

---

## Step 3: Deploy as a Web App
1. Click the blue **Deploy** button at top right > **New deployment**.
2. Click the gear icon (Select type) > choose **Web app**.
3. Set the following options:
   - **Description**: `KickStart Registration Webhook`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial: allows frontend to submit without logging in)*
4. Click **Deploy**.
5. Grant permissions if prompted (Click *Advanced* > *Go to Untitled project (unsafe)* > *Allow*).
6. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Step 4: Add to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com) > Select your `kickstart` project.
2. Go to **Settings** > **Environment Variables**.
3. Add a new variable:
   - **Key**: `VITE_GOOGLE_SHEETS_URL`
   - **Value**: *(Paste your copied Web App URL)*
   - **Environments**: Check all (Production, Preview, Development)
4. Click **Save**.
5. Click **Deployments** > Click the three dots on your latest deployment > **Redeploy**.

---

## How It Works:
- When a candidate fills the form on `/contact` and clicks **Proceed to Payment**, their full registration details are sent to Google Sheets with **`Paid = NOT PAID`**.
- When payment is verified or confirmed, the script finds that candidate's Order ID and updates the cell to **`PAID`** in green!

