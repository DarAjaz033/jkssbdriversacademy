
$file = "$PSScriptRoot\profile-page.ts"
$content = [System.IO.File]::ReadAllText($file)

$old = '(?s)      // Premium Status logic\r?\n      const premium = await isPremiumUser\(user\.uid\);\r?\n      if \(premium\) \{\r?\n        this\.showInline\(''p-premium-badge''\);\r?\n        this\.showInline\(''p-star-badge''\);\r?\n        this\.showInline\(''p-edit-avatar''\);\r?\n        this\.hide\(''premium-info-banner''\);\r?\n        this\.hide\(''ic-premium-row''\);\r?\n        this\.hide\(''not-premium-badge''\);\r?\n      \} else \{\r?\n        this\.hide\(''p-premium-badge''\);\r?\n        this\.hide\(''p-star-badge''\);\r?\n        this\.hide\(''p-edit-avatar''\);\r?\n        this\.show\(''not-premium-badge''\);\r?\n        this\.show\(''premium-info-banner''\);\r?\n        this\.show\(''ic-premium-row''\);\r?\n      \}\r?\n\r?\n    \} catch \(err\) \{'

$new = '      // Premium Status logic
      const premium = await isPremiumUser(user.uid);
      
      const premiumPoints = document.querySelectorAll(''.premium-point'');
      const unlockCta = document.getElementById(''unlock-cta'');
      
      if (premium) {
        this.showInline(''p-premium-badge'');
        this.showInline(''p-star-badge'');
        this.showInline(''p-edit-avatar'');
        this.hide(''ic-premium-row'');
        this.hide(''not-premium-badge'');
        
        // Unlock all premium points
        premiumPoints.forEach(pt => pt.classList.add(''unlocked''));
        if (unlockCta) unlockCta.style.display = ''none'';
      } else {
        this.hide(''p-premium-badge'');
        this.hide(''p-star-badge'');
        this.hide(''p-edit-avatar'');
        this.show(''not-premium-badge'');
        this.show(''ic-premium-row'');
        
        // Lock all premium points
        premiumPoints.forEach(pt => pt.classList.remove(''unlocked''));
        if (unlockCta) unlockCta.style.display = ''block'';
      }

    } catch (err) {'

$content = $content -replace $old, $new

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "profile-page.ts updated successfully!"
