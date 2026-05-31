/**
 * Who sees the Treasury / Accounting link on the WebApp (PMES staff JWT role).
 * Actual sign-in to finance.b2ccoop.com still requires a row in Accounting StaffUser (superuser manages).
 */
export function canOpenAccounting(staffRole) {
  const r = String(staffRole ?? "").toLowerCase();
  return (
    r === "treasurer" ||
    r === "admin" ||
    r === "superuser" ||
    r === "secretary" ||
    r === "board_director"
  );
}
