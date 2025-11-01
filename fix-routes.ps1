# Fix Teacher Routes
$teacherFiles = Get-ChildItem -Path "src/app/(dashboard)/teacher" -Recurse -Filter "*.tsx"
foreach ($file in $teacherFiles) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '/teacher/dashboard/', '/teacher/'
    if ($content -ne $newContent) {
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

# Fix Student Routes - only in student folder
$studentFiles = Get-ChildItem -Path "src/app/(dashboard)/student" -Recurse -Filter "*.tsx"
foreach ($file in $studentFiles) {
    $content = Get-Content $file.FullName -Raw
    # Replace /dashboard/ with /student/ but be careful
    $newContent = $content -replace '"/dashboard/', '"/student/'
    $newContent = $newContent -replace "'/dashboard/", "'/student/"
    $newContent = $newContent -replace '`/dashboard/', '`/student/'
    if ($content -ne $newContent) {
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "`nRoute replacement complete!"
Write-Host "Teacher routes: /teacher/dashboard/ -> /teacher/"
Write-Host "Student routes: /dashboard/ -> /student/"
