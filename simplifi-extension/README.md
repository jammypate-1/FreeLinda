# FreeLinda Simplifi sync

A Chrome extension that keeps FreeLinda's Withdrawal Plan current from Simplifi.

Once a day (after 5 am, while Chrome is open) and whenever its toolbar button is clicked, it opens
simplifi.quicken.com in a background tab, lets Simplifi refresh with Linda's own sign-in, reads the account
balances and the last 400 days of transactions from that page's storage, posts them to
https://freelinda.web.app/api/simplifi-sync and closes the tab. It never reads or sends the Simplifi sign-in
and never changes anything in Simplifi.

Install: unzip, open chrome://extensions, turn on Developer mode, Load unpacked, pick this folder. Then open
FreeLinda > Withdrawal Plan in the same Chrome and press Connect.
