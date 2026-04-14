// ============================================================
// Avenue 88 Tools — Google Apps Script (UPDATED)
// ============================================================
// 
// IMPORTANT: Replace your existing Apps Script with this version.
// Then redeploy: Deploy > Manage deployments > Edit (pencil icon)
// > Version: "New version" > Deploy
//
// ============================================================

function doGet(e) {
  try {
    var params = e.parameter;
    
    // If no type param, just return status
    if (!params.type) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", message: "Avenue 88 Tools API is running" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var timestamp = new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" });
    
    if (params.type === "lead") {
      var sheet = ss.getSheetByName("Leads");
      sheet.appendRow([
        timestamp,
        params.name || "",
        params.phone || "",
        params.email || "",
        params.town || "",
        params.propertyType || "",
        params.helpWith || "",
        params.sourcePage || ""
      ]);
    } else if (params.type === "tool_usage") {
      var sheet = ss.getSheetByName("Tool Usage");
      sheet.appendRow([
        timestamp,
        params.tool || "",
        params.streetName || "",
        params.flatType || "",
        params.sizeSqm || "",
        params.floorLevel || "",
        params.resultShown || "",
        params.page || ""
      ]);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var timestamp = new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" });
    
    if (data.type === "lead") {
      var sheet = ss.getSheetByName("Leads");
      sheet.appendRow([
        timestamp,
        data.name || "",
        data.phone || "",
        data.email || "",
        data.town || "",
        data.propertyType || "",
        data.helpWith || "",
        data.sourcePage || ""
      ]);
    } else if (data.type === "tool_usage") {
      var sheet = ss.getSheetByName("Tool Usage");
      sheet.appendRow([
        timestamp,
        data.tool || "",
        data.streetName || "",
        data.flatType || "",
        data.sizeSqm || "",
        data.floorLevel || "",
        data.resultShown || "",
        data.page || ""
      ]);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
