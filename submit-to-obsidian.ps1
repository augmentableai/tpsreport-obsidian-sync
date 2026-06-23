$ErrorActionPreference = "Stop"
$input = "protocol=https`nhost=github.com`n`n"
$credText = $input | git credential fill 2>$null
$token = ($credText | Select-String '^password=(.+)$').Matches.Groups[1].Value
$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$owner = "augmentableai"
$repo = "obsidian-releases"
$branch = "add-plugin-tpsreport"

$upstreamMaster = Invoke-RestMethod -Uri "https://api.github.com/repos/obsidianmd/obsidian-releases/git/ref/heads/master" -Headers $headers
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/master" -Headers $headers -Method Patch -Body (@{ sha = $upstreamMaster.object.sha } | ConvertTo-Json) -ContentType "application/json" | Out-Null
} catch {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs" -Headers $headers -Method Post -Body (@{ ref = "refs/heads/master"; sha = $upstreamMaster.object.sha } | ConvertTo-Json) -ContentType "application/json" | Out-Null
}
Write-Host "Synced fork master"

$fileMeta = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/community-plugins.json?ref=master" -Headers $headers
$content = (Invoke-WebRequest -Uri $fileMeta.download_url -Headers @{ Authorization = "Bearer $token" }).Content
if ($content -match '"id"\s*:\s*"tpsreport-sync"') {
    Write-Host "Plugin entry already present"
} else {
    $entry = @'
    {
        "id": "tpsreport-sync",
        "name": "TPSReport",
        "author": "Augmentable LLC",
        "description": "Sync notes, research folders, and images with TPSReport AI Brain & Knowledge Management. Requires a TPSReport account.",
        "repo": "augmentableai/tpsreport-obsidian-sync"
    }
'@
    $trimmed = $content.TrimEnd()
    $inner = $trimmed.Substring(0, $trimmed.Length - 1).TrimEnd()
    if (-not $inner.EndsWith('[')) { $inner += ',' }
    $newContent = $inner + "`n" + $entry + "`n]"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($newContent))

    try {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs" -Headers $headers -Method Post -Body (@{ ref = "refs/heads/$branch"; sha = $upstreamMaster.object.sha } | ConvertTo-Json) -ContentType "application/json" | Out-Null
    } catch {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/$branch" -Headers $headers -Method Patch -Body (@{ sha = $upstreamMaster.object.sha; force = $true } | ConvertTo-Json) -ContentType "application/json" | Out-Null
    }

    $updateBody = @{
        message = "Add plugin: TPSReport"
        content = $encoded
        sha = $fileMeta.sha
        branch = $branch
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/community-plugins.json" -Headers $headers -Method Put -Body $updateBody -ContentType "application/json" | Out-Null
    Write-Host "Updated community-plugins.json on branch $branch"
}

$existingPrs = Invoke-RestMethod -Uri "https://api.github.com/repos/obsidianmd/obsidian-releases/pulls?head=${owner}:${branch}&state=all" -Headers $headers
if ($existingPrs.Count -gt 0) {
    Write-Host "PR: $($existingPrs[0].html_url)"
} else {
    $prBody = @"
## Summary
Add TPSReport (``tpsreport-sync``) to the Obsidian community plugin directory.

- [x] I have read the submission guidelines
- [x] My repo contains ``README.md``, ``LICENSE``, ``manifest.json``, ``main.js``
- [x] I have created a release tagged ``1.2.2`` with the required assets
- [x] My plugin ID is unique and does not contain "obsidian"

Plugin repo: https://github.com/augmentableai/tpsreport-obsidian-sync
Release: https://github.com/augmentableai/tpsreport-obsidian-sync/releases/tag/1.2.2
"@
    $pr = Invoke-RestMethod -Uri "https://api.github.com/repos/obsidianmd/obsidian-releases/pulls" -Headers $headers -Method Post -Body (@{
        title = "Add plugin: TPSReport"
        head = "${owner}:${branch}"
        base = "master"
        body = $prBody
    } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Created PR: $($pr.html_url)"
}
