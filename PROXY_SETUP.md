# Proxy Configuration for Instagram Downloads

Due to Instagram's blocking of datacenter IPs, you'll need a residential proxy service for production use.

## Quick Start

Add one of these to your Fly.io secrets or environment variables:

### Option 1: Generic Proxy URL
```bash
fly secrets set PROXY_URL="http://username:password@proxy-server:port"
```

### Option 2: Bright Data (Recommended for testing)
- Free trial: $5 credit
- Website: https://brightdata.com
- Residential IPs: ~$15/GB

```bash
fly secrets set BRIGHTDATA_USERNAME="your-username-country-session"
fly secrets set BRIGHTDATA_PASSWORD="your-password"
```

### Option 3: Smartproxy
- Free trial: 3-day money back
- Website: https://smartproxy.com
- Residential IPs: ~$7/GB with pay-as-you-go

```bash
fly secrets set SMARTPROXY_USERNAME="your-username"
fly secrets set SMARTPROXY_PASSWORD="your-password"
```

### Option 4: Oxylabs
- Free trial: Available on request
- Website: https://oxylabs.io
- Residential IPs: ~$10/GB

```bash
fly secrets set OXYLABS_USERNAME="customer-username"
fly secrets set OXYLABS_PASSWORD="password"
```

## Free Testing Options

1. **Bright Data** - Sign up for free $5 credit:
   - Go to https://brightdata.com
   - Sign up for free trial
   - Create a Residential Proxy zone
   - Use the credentials in your environment

2. **Webshare** - 10 proxy free plan:
   ```bash
   fly secrets set PROXY_URL="http://username:password@p.webshare.io:80"
   ```

3. **ProxyScrape** - Limited free residential proxies:
   - Not recommended for production but OK for testing

## Cost Estimates

For a typical Instagram downloader app:
- **Light usage** (100 downloads/day): ~$10-20/month
- **Medium usage** (500 downloads/day): ~$50-100/month  
- **Heavy usage** (2000+ downloads/day): ~$200-500/month

## Testing Locally

```bash
# Test with proxy locally
export PROXY_URL="http://username:password@proxy:port"
cd backend && python main.py
```

## Verification

After setting up, test with:
```bash
curl https://your-app.fly.dev/download -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/p/TEST/", "user_id": "test"}'
```

## Important Notes

- Residential proxies rotate IPs automatically
- Each download uses ~5-10MB of proxy bandwidth
- Stories/carousels use more bandwidth
- Consider caching downloads to reduce costs
- Set rate limits to control costs

## Recommended Setup for Production

1. Start with Bright Data's $5 free trial
2. Monitor usage for a week
3. Calculate average bandwidth per download
4. Choose plan based on projected usage

## Support

The backend automatically detects and uses any configured proxy. No code changes needed!