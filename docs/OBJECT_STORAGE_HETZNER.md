# Why Hetzner Shows 0 Files (and How to Use Hetzner)

## Why you see 0 B / 0 Files in Hetzner

Your upload **link** is:

`https://ampli5.s3.amazonaws.com/...`

That domain is **Amazon S3**, not Hetzner. So:

- The app is currently using **AWS S3** (no `S3_ENDPOINT` in `.env`).
- All uploads go to **Amazon’s** bucket “ampli5”, not to your **Hetzner** bucket.
- That’s why the **Hetzner** dashboard shows 0 traffic and 0 data: nothing is being sent to Hetzner.

So nothing is broken in the app; it’s just pointed at AWS instead of Hetzner.

---

## How to Use Hetzner Object Storage

To send uploads to your Hetzner bucket (e.g. “ampli5” at `hel1.your-objectstorage.com`):

1. **Create S3 credentials in Hetzner**  
   In the Hetzner Cloud Console → your bucket → **S3 Credentials** → **Manage credentials** → create access key + secret.

2. **Set these in `.env`** (replace with your real values):

```env
# Bucket name (same as in Hetzner, e.g. ampli5)
AWS_S3_BUCKET_NAME=ampli5

# Hetzner S3 credentials (from step 1)
AWS_ACCESS_KEY_ID=your_hetzner_access_key
AWS_SECRET_ACCESS_KEY=your_hetzner_secret_key

# Region/location of your bucket (hel1 = Helsinki, fsn1 = Falkenstein, nbg1 = Nuremberg)
AWS_REGION=hel1

# Required for Hetzner – use your bucket’s endpoint
S3_ENDPOINT=https://hel1.your-objectstorage.com
```

Use your real endpoint host (e.g. the one shown in the Hetzner UI for the bucket, like `hel1.your-objectstorage.com`). Do **not** leave `S3_ENDPOINT` commented out if you want Hetzner.

3. **Restart the app** so it reloads `.env`.

After that, new uploads will go to **Hetzner**, and the Hetzner dashboard will show traffic and file count. Existing files that were uploaded to AWS will stay on AWS unless you migrate them.

---

## Summary

| Current setup (no S3_ENDPOINT) | With S3_ENDPOINT + Hetzner credentials |
|--------------------------------|----------------------------------------|
| Uploads go to **Amazon S3**    | Uploads go to **Hetzner Object Storage** |
| Links: `ampli5.s3.amazonaws.com` | Links: signed URLs or your Hetzner endpoint |
| Hetzner dashboard: 0 files     | Hetzner dashboard: shows your files     |

So: **Hetzner shows 0 because the app is still using AWS. Set `S3_ENDPOINT` and Hetzner S3 credentials to use Hetzner.**
