$base = "http://localhost:5000/api"

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "admin@demo.com"; password = "Admin123" } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }

$vendors = Invoke-RestMethod -Uri "$base/vendors?page=1&limit=20" -Headers $headers -Method Get
$vendorsPending = Invoke-RestMethod -Uri "$base/vendors?status=PENDING&page=1&limit=20" -Headers $headers -Method Get
$vendorsVerified = Invoke-RestMethod -Uri "$base/vendors?status=VERIFIED&page=1&limit=20" -Headers $headers -Method Get
$vendorsRejected = Invoke-RestMethod -Uri "$base/vendors?status=REJECTED&page=1&limit=20" -Headers $headers -Method Get

$procLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "procure@demo.com"; password = "Proc123" } | ConvertTo-Json)
$procHeaders = @{ Authorization = "Bearer $($procLogin.token)" }

$poAll = Invoke-RestMethod -Uri "$base/pos" -Headers $procHeaders -Method Get
$poPending = Invoke-RestMethod -Uri "$base/pos?status=PENDING_APPROVAL" -Headers $procHeaders -Method Get
$poApproved = Invoke-RestMethod -Uri "$base/pos?status=APPROVED" -Headers $procHeaders -Method Get
$poRejected = Invoke-RestMethod -Uri "$base/pos?status=REJECTED" -Headers $procHeaders -Method Get
$poDraft = Invoke-RestMethod -Uri "$base/pos?status=DRAFT" -Headers $procHeaders -Method Get
$poClosed = Invoke-RestMethod -Uri "$base/pos?status=CLOSED" -Headers $procHeaders -Method Get

$contractsAll = Invoke-RestMethod -Uri "$base/contracts?page=1&limit=20" -Headers $headers -Method Get
$contractsActive = Invoke-RestMethod -Uri "$base/contracts?status=ACTIVE&page=1&limit=20" -Headers $headers -Method Get
$contractsExpired = Invoke-RestMethod -Uri "$base/contracts?status=EXPIRED&page=1&limit=20" -Headers $headers -Method Get
$contractsTerminated = Invoke-RestMethod -Uri "$base/contracts?status=TERMINATED&page=1&limit=20" -Headers $headers -Method Get

$audit = Invoke-RestMethod -Uri "$base/audit-logs?page=1&limit=20" -Headers $headers -Method Get
$dashboard = Invoke-RestMethod -Uri "$base/dashboard/stats" -Headers $headers -Method Get

$finLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "finance@demo.com"; password = "Fin123" } | ConvertTo-Json)
$finHeaders = @{ Authorization = "Bearer $($finLogin.token)" }
$invoices = Invoke-RestMethod -Uri "$base/invoices" -Headers $finHeaders -Method Get
$invoiceStatusCounts = $invoices.invoices | Group-Object status | ForEach-Object { "{0}:{1}" -f $_.Name, $_.Count }

$vendorLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{ email = "vendor@demo.com"; password = "Vend123" } | ConvertTo-Json)
$vendorHeaders = @{ Authorization = "Bearer $($vendorLogin.token)" }
$vendorDashboard = Invoke-RestMethod -Uri "$base/vendor/dashboard" -Headers $vendorHeaders -Method Get
$vendorInvoices = Invoke-RestMethod -Uri "$base/invoices" -Headers $vendorHeaders -Method Get

Write-Output "VENDORS total=$($vendors.total) pending=$($vendorsPending.total) verified=$($vendorsVerified.total) rejected=$($vendorsRejected.total)"
Write-Output "POS all=$($poAll.total) draft=$($poDraft.total) pending=$($poPending.total) approved=$($poApproved.total) rejected=$($poRejected.total) closed=$($poClosed.total)"
Write-Output "CONTRACTS total=$($contractsAll.pagination.total) active=$($contractsActive.pagination.total) expired=$($contractsExpired.pagination.total) terminated=$($contractsTerminated.pagination.total)"
Write-Output "INVOICES_FINANCE total=$($invoices.total) statuses=$($invoiceStatusCounts -join ',')"
Write-Output "AUDIT total=$($audit.pagination.total)"
Write-Output "DASHBOARD activeVendors=$($dashboard.stats.totalActiveVendors) pendingMyApproval=$($dashboard.stats.posPendingMyApproval) invoicesPendingReview=$($dashboard.stats.invoicesPendingReview) contractsExpiringThisMonth=$($dashboard.stats.contractsExpiringThisMonth)"
Write-Output "VENDOR_PORTAL poCount=$($vendorDashboard.summary.poCount) invoiceCount=$($vendorDashboard.summary.submittedInvoiceCount) activeContracts=$($vendorDashboard.summary.contractSummary.active) vendorInvoiceList=$($vendorInvoices.total)"
