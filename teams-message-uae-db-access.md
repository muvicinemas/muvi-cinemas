## UAE UAT Database — Direct Access Now Available

**What changed:**
The UAE UAT databases are now publicly accessible — connect directly with host + password, no tunnel or VPN needed.

**Why we did this:**
When we migrated the databases from Frankfurt to UAE (me-central-1), we initially locked them down by setting `PubliclyAccessible=False` as a security best practice. This required an SSH tunnel through a bastion server to connect, which added complexity for local development.

**Why we reverted:**
The previous UAE UAT databases (the standalone RDS instances created by Zeeshan's team) were also publicly accessible — developers connected directly with just host/password. Since this is a UAT environment (not production), we've reverted to the same approach for developer convenience. The bastion and tunnel infrastructure have been removed.

**Connection Details (same for all 6 databases):**
```
Host:     uatclusterdb.cluster-cwyxrbeukelc.me-central-1.rds.amazonaws.com
Port:     5432
Username: postgres
Password: HR)q0Cpn?D$OyqREGo0-BlupVueo
```

**Database names:**
| Service | Database Name |
|---------|--------------|
| Main | muvi_main_service |
| Identity | muvi_identity_service |
| Payment | muvi_payment_service |
| F&B | muvi_fb_db |
| Notification | muvi_notification_service |
| Offer | muvi_offer_service |

**For the codebase:** `docker-compose.yml` is already updated — just `git pull` and `docker compose up -d`.

**Note:** Production databases in UAE will remain behind private VPC + RDS Proxy (not publicly accessible). This public access is UAT only.
