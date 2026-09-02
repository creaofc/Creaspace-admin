/**
 * Creā Space ERP — Google Apps Script Web App
 *
 * SETUP:
 * 1. Open your Google Sheet.
 * 2. Extensions → Apps Script → paste this file → Save.
 * 3. Deploy → New deployment → Type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the /exec URL and paste it into the ERP app on first launch.
 *
 * The script auto-creates all required sheets and the Admin row on first call.
 */

const ADMIN_EMAIL = "creaspace.business@gmail.com";
const ADMIN_PASSWORD = "Crea@0102";

const SHEETS = {
  Admin: ["Email", "Password", "Role"],
  Clients: [
    "Client ID",
    "Client Name",
    "Business Name",
    "Location",
    "Project Price",
    "Advance Payment",
    "Remaining Payment",
    "Email",
    "Phone Number",
    "WordPress Username",
    "WordPress Password",
    "Payment Status",
    "Created Date",
    "Updated Date",
  ],
  Payments: [
    "Payment ID",
    "Client ID",
    "Client Name",
    "Business Name",
    "Payment Amount",
    "Remaining Payment",
    "Payment Status",
    "Payment Date",
  ],
  Expenses: ["Expense ID", "Expense Name", "Expense Details", "Expense Amount", "Expense Date"],
  Demos: ["Demo ID", "Business Name", "Demo Link", "Added Date"],
  ActivityLogs: ["Activity ID", "Activity", "User", "Date", "Time"],
};

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(SHEETS[name]);
    } else if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
    }
  });
  var admin = ss.getSheetByName("Admin");
  if (admin.getLastRow() < 2) {
    admin.appendRow([ADMIN_EMAIL, ADMIN_PASSWORD, "Admin"]);
  }
}

function readSheet_(name) {
  ensureSheets_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  var headers = vals[0];
  return vals.slice(1).map(function (row) {
    var o = {};
    headers.forEach(function (h, i) {
      o[h] = row[i];
    });
    return o;
  });
}

function appendRow_(name, obj) {
  ensureSheets_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return obj[h] === undefined ? "" : obj[h];
  });
  sh.appendRow(row);
}

function updateRow_(name, idKey, idValue, patch) {
  ensureSheets_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var vals = sh.getDataRange().getValues();
  var headers = vals[0];
  var idx = headers.indexOf(idKey);
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][idx]) === String(idValue)) {
      headers.forEach(function (h, c) {
        if (patch[h] !== undefined) sh.getRange(r + 1, c + 1).setValue(patch[h]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow_(name, idKey, idValue) {
  ensureSheets_();
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var vals = sh.getDataRange().getValues();
  var headers = vals[0];
  var idx = headers.indexOf(idKey);
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][idx]) === String(idValue)) {
      sh.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

function log_(activity, user) {
  var now = new Date();
  appendRow_("ActivityLogs", {
    "Activity ID": "LOG-" + now.getTime(),
    Activity: activity,
    User: user || "Admin",
    Date: Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    Time: Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss"),
  });
}

function nowIso_() {
  return new Date().toISOString();
}
function uid_(prefix) {
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet(e) {
  try {
    ensureSheets_();
    var action = (e.parameter && e.parameter.action) || "ping";
    if (action === "ping") return jsonOut_({ ok: true, message: "Creā Space ERP API" });
    if (action === "all") {
      return jsonOut_({
        ok: true,
        clients: readSheet_("Clients"),
        payments: readSheet_("Payments"),
        expenses: readSheet_("Expenses"),
        demos: readSheet_("Demos"),
        logs: readSheet_("ActivityLogs"),
      });
    }
    if (action === "sheet") {
      var name = e.parameter.name;
      return jsonOut_({ ok: true, data: readSheet_(name) });
    }
    if (action === "login") {
      var email = e.parameter.email,
        password = e.parameter.password;
      var admin = readSheet_("Admin")[0];
      if (admin && String(admin.Email) === email && String(admin.Password) === password) {
        log_("Login", email);
        return jsonOut_({ ok: true, user: { email: admin.Email, role: admin.Role } });
      }
      return jsonOut_({ ok: false, error: "Invalid Email or Password" });
    }
    return jsonOut_({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    ensureSheets_();
    var body = {};
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {}
    var action = body.action;
    var user = body.user || "Admin";

    if (action === "addClient") {
      var c = body.data;
      var price = Number(c.projectPrice) || 0,
        adv = Number(c.advancePayment) || 0;
      var rem = price - adv;
      var id = uid_("CL");
      var now = nowIso_();
      appendRow_("Clients", {
        "Client ID": id,
        "Client Name": c.clientName,
        "Business Name": c.businessName,
        Location: c.location,
        "Project Price": price,
        "Advance Payment": adv,
        "Remaining Payment": rem,
        Email: c.email,
        "Phone Number": c.phone,
        "WordPress Username": c.wpUsername || "",
        "WordPress Password": c.wpPassword || "",
        "Payment Status": rem <= 0 ? "Completed" : "Pending",
        "Created Date": now,
        "Updated Date": now,
      });
      if (adv > 0) {
        appendRow_("Payments", {
          "Payment ID": uid_("PAY"),
          "Client ID": id,
          "Client Name": c.clientName,
          "Business Name": c.businessName,
          "Payment Amount": adv,
          "Remaining Payment": rem,
          "Payment Status": rem <= 0 ? "Completed" : "Pending",
          "Payment Date": now,
        });
      }
      log_("Client Added: " + c.businessName, user);
      return jsonOut_({ ok: true, id: id });
    }

    if (action === "updateClient") {
      var d = body.data;
      var price = Number(d.projectPrice) || 0,
        adv = Number(d.advancePayment) || 0;
      // recalc remaining from existing payments if paymentsRecalc
      var payments = readSheet_("Payments").filter(function (p) {
        return p["Client ID"] === d.clientId;
      });
      var paid = payments.reduce(function (s, p) {
        return s + (Number(p["Payment Amount"]) || 0);
      }, 0);
      // use max of advance or total payments
      var totalPaid = Math.max(paid, adv);
      var rem = price - totalPaid;
      updateRow_("Clients", "Client ID", d.clientId, {
        "Client Name": d.clientName,
        "Business Name": d.businessName,
        Location: d.location,
        "Project Price": price,
        "Advance Payment": adv,
        "Remaining Payment": rem,
        Email: d.email,
        "Phone Number": d.phone,
        "WordPress Username": d.wpUsername || "",
        "WordPress Password": d.wpPassword || "",
        "Payment Status": rem <= 0 ? "Completed" : "Pending",
        "Updated Date": nowIso_(),
      });
      log_("Client Updated: " + d.businessName, user);
      return jsonOut_({ ok: true });
    }

    if (action === "deleteClient") {
      deleteRow_("Clients", "Client ID", body.clientId);
      log_("Client Deleted: " + body.clientId, user);
      return jsonOut_({ ok: true });
    }

    if (action === "receivePayment") {
      var p = body.data;
      var clients = readSheet_("Clients");
      var client = clients.filter(function (x) {
        return x["Client ID"] === p.clientId;
      })[0];
      if (!client) return jsonOut_({ ok: false, error: "Client not found" });
      var amount = Number(p.amount) || 0;
      var newRem = (Number(client["Remaining Payment"]) || 0) - amount;
      if (newRem < 0) newRem = 0;
      var status = newRem <= 0 ? "Completed" : "Pending";
      appendRow_("Payments", {
        "Payment ID": uid_("PAY"),
        "Client ID": p.clientId,
        "Client Name": client["Client Name"],
        "Business Name": client["Business Name"],
        "Payment Amount": amount,
        "Remaining Payment": newRem,
        "Payment Status": status,
        "Payment Date": nowIso_(),
      });
      var newAdv = (Number(client["Advance Payment"]) || 0) + amount;
      updateRow_("Clients", "Client ID", p.clientId, {
        "Advance Payment": newAdv,
        "Remaining Payment": newRem,
        "Payment Status": status,
        "Updated Date": nowIso_(),
      });
      log_("Payment Received: " + amount + " for " + client["Business Name"], user);
      return jsonOut_({ ok: true });
    }

    if (action === "addExpense") {
      var ex = body.data;
      appendRow_("Expenses", {
        "Expense ID": uid_("EXP"),
        "Expense Name": ex.name,
        "Expense Details": ex.details || "",
        "Expense Amount": Number(ex.amount) || 0,
        "Expense Date": nowIso_(),
      });
      log_("Expense Added: " + ex.name, user);
      return jsonOut_({ ok: true });
    }
    if (action === "deleteExpense") {
      deleteRow_("Expenses", "Expense ID", body.expenseId);
      log_("Expense Deleted: " + body.expenseId, user);
      return jsonOut_({ ok: true });
    }

    if (action === "addDemo") {
      var dm = body.data;
      appendRow_("Demos", {
        "Demo ID": uid_("DEMO"),
        "Business Name": dm.businessName,
        "Demo Link": dm.link,
        "Added Date": nowIso_(),
      });
      log_("Demo Added: " + dm.businessName, user);
      return jsonOut_({ ok: true });
    }
    if (action === "deleteDemo") {
      deleteRow_("Demos", "Demo ID", body.demoId);
      log_("Demo Deleted: " + body.demoId, user);
      return jsonOut_({ ok: true });
    }

    if (action === "log") {
      log_(body.activity, user);
      return jsonOut_({ ok: true });
    }

    return jsonOut_({ ok: false, error: "Unknown action" });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
