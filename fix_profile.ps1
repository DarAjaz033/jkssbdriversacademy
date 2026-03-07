
# Reads profile.html, applies all changes, saves
$profilePath = "$PSScriptRoot\profile.html"
$content = [System.IO.File]::ReadAllText($profilePath)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Replace old premium-point CSS with new locked/unlocked styles
# ─────────────────────────────────────────────────────────────────────────────
$content = $content -replace '(?s)    \.premium-info-banner h4 \{.*?text-transform: uppercase;\r?\n      letter-spacing: 1px;\r?\n    \}\r?\n\r?\n    \.premium-points \{.*?gap: 10px;\r?\n    \}\r?\n\r?\n    \.premium-point \{.*?border: 1px solid rgba\(255, 255, 255, 0\.05\);\r?\n    \}', `
'    .premium-info-banner h4 {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 800;
      color: #fbbf24;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .premium-points { display: grid; gap: 8px; }
    /* Locked (non-premium): faded italic */
    .premium-point {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #a1a1aa; font-style: italic; font-weight: 600;
      padding: 9px 14px; background: rgba(161,161,170,0.06);
      border-radius: 10px; border: 1px solid rgba(161,161,170,0.15);
      transition: all 0.25s;
    }
    /* Unlocked (premium): colored solid */
    .premium-point.unlocked {
      color: #1c1917; font-style: normal; font-weight: 700;
      background: rgba(255,255,255,0.85); border: 1px solid rgba(251,191,36,0.3);
    }
    [data-theme="dark"] .premium-point.unlocked,
    [data-theme="black"] .premium-point.unlocked {
      color: #f5f5f4; background: rgba(255,255,255,0.08);
    }
    .premium-point .lock-icon { color: #94a3b8; font-style: normal; }
    .premium-point.unlocked .lock-icon { color: #22c55e; }'

# ─────────────────────────────────────────────────────────────────────────────
# 2. Replace the 4-item premium-info-banner with the new 9-item version
# ─────────────────────────────────────────────────────────────────────────────
$content = $content -replace '(?s)      <!-- Premium Info Banner -->.*?</div>\r?\n      <!-- Account \(only for logged-in\) -->', `
'      <!-- Premium Info Banner (always visible, locked for free users) -->
      <div id="premium-info-banner" class="premium-info-banner">
        <h4>&#128274; <strong>Premium Unlocks</strong></h4>
        <div class="premium-points" id="premium-points-list">
          <div class="premium-point" data-key="leaderboard"><span class="lock-icon">&#128274;</span> Leaderboard Access</div>
          <div class="premium-point" data-key="ai-sir"><span class="lock-icon">&#128274;</span> AI Sir (Personal Tutor)</div>
          <div class="premium-point" data-key="quizzes"><span class="lock-icon">&#128274;</span> Personalized Quizzes</div>
          <div class="premium-point" data-key="picture"><span class="lock-icon">&#128274;</span> Custom Profile Picture</div>
          <div class="premium-point" data-key="badge"><span class="lock-icon">&#128274;</span> Pro Badge on Profile</div>
          <div class="premium-point" data-key="rankings"><span class="lock-icon">&#128274;</span> Weekly Quiz Rankings</div>
          <div class="premium-point" data-key="offline"><span class="lock-icon">&#128274;</span> Offline Study Material</div>
          <div class="premium-point" data-key="progress"><span class="lock-icon">&#128274;</span> Automatic Progress Tracking</div>
          <div class="premium-point" data-key="analytics"><span class="lock-icon">&#128274;</span> Smart Study Analytics</div>
        </div>
        <a href="./course-details.html" class="unlock-link" id="unlock-cta" style="display:none;">Unlock Premium Access &#8594;</a>
      </div>
      <!-- Account (only for logged-in) -->'

# ─────────────────────────────────────────────────────────────────────────────
# 3. Remove Resources section (GK PDFs, JKSSB Updates, Mock Tests)
# ─────────────────────────────────────────────────────────────────────────────
$content = $content -replace '(?s)        <div class="menu-section">\r?\n          <div class="menu-section-title">Resources</div>.*?        </div>\r?\n\r?\n        <div class="menu-section">\r?\n          <div class="menu-section-title">Preferences</div>', `
'        <div class="menu-section">
          <div class="menu-section-title">Preferences</div>'

# ─────────────────────────────────────────────────────────────────────────────
# 4. Remove Language item from Preferences
# ─────────────────────────────────────────────────────────────────────────────
$content = $content -replace '(?s)            <a href="#" class="menu-item" onclick="alert\(''Language settings coming soon!''\); return false;">.*?</a>\r?\n            <div class="menu-item"', `
'            <div class="menu-item"'

# ─────────────────────────────────────────────────────────────────────────────
# 5. Remove Legal section entirely
# ─────────────────────────────────────────────────────────────────────────────
$content = $content -replace '(?s)        <div class="menu-section">\r?\n          <div class="menu-section-title">Legal</div>.*?        </div>\r?\n\r?\n        <!-- Sign Out', `
'        <!-- Sign Out'

[System.IO.File]::WriteAllText($profilePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "profile.html updated successfully!"
