# Study Cache Failure Monitor
- scheduled task to monitor cache failure
- uses `mssql` to query cache status
- uses `nodemailer` to send email alerts via SMTP if cache fails
- requires gmail application password to use specified account

## writes hashes of errors to a json which is cross-referenced when db query is returned to not repeatedly notify for the same error 
