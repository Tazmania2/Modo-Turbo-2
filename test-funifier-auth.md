# 🧪 Test Funifier Authentication

## 🔍 **Debug Steps**

### **1. Check Payload Debug**
Visit: `/api/debug/auth-payload?instance=YOUR_INSTANCE_ID`

**POST Body**:
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

This will show you:
- ✅ Exact payload being sent to Funifier
- ✅ API key status (masked for security)
- ✅ Funifier response details
- ✅ Any network errors

### **2. Expected Payload Format**
According to Funifier docs, we should send:
```json
{
  "apiKey": "YOUR_API_KEY",
  "grant_type": "password",
  "username": "tom",
  "password": "123"
}
```

### **3. Possible Issues**

#### **API Key Problems**:
- ❓ API key not saved during setup
- ❓ API key format incorrect
- ❓ API key expired or invalid

#### **Endpoint Problems**:
- ❓ Wrong server URL
- ❓ Network connectivity issues
- ❓ CORS or security restrictions

#### **Payload Problems**:
- ❓ Missing required fields
- ❓ Incorrect field names
- ❓ Wrong data types

### **4. Manual Test**

You can test the Funifier API directly with curl:

```bash
curl -X POST https://service2.funifier.com/v3/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_ACTUAL_API_KEY",
    "grant_type": "password",
    "username": "your_username",
    "password": "your_password"
  }'
```

### **5. Common Issues**

#### **"Need to inform a type of authentication"**:
- Usually means missing or invalid `apiKey`
- Check if API key is properly saved during setup
- Verify API key format and validity

#### **404 "Could not find resource"**:
- Wrong endpoint URL
- Server URL incorrect in configuration

#### **401 "Unauthorized"**:
- Invalid credentials (username/password)
- API key doesn't have permission

## 🔧 **Next Steps**

1. **Use debug endpoint** to see exact payload
2. **Check API key** in setup configuration
3. **Test manually** with curl if needed
4. **Verify server URL** is correct
5. **Check Funifier account** permissions

The debug endpoint will show us exactly what's being sent and what Funifier is responding with.