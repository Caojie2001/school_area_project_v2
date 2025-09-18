# SSL证书使用说明

## 📁 文件说明

- **key.pem**: 私钥文件（2048位RSA，请妥善保管）
- **cert.pem**: SSL证书文件（有效期365天）
- **generate_cert.sh**: 证书生成脚本

## 🔒 证书信息

- **证书类型**: 自签名SSL证书
- **加密算法**: RSA 2048位
- **有效期**: 365天 (2025/08/28 - 2026/08/28)
- **支持域名**: 
  - localhost
  - 127.0.0.1
  - *.localhost
  - IPv6: ::1

## 🚀 在Node.js中使用

```javascript
const fs = require('fs');
const https = require('https');
const express = require('express');

const app = express();

// SSL证书配置
const sslOptions = {
    key: fs.readFileSync('./config/certs/key.pem'),
    cert: fs.readFileSync('./config/certs/cert.pem')
};

// 创建HTTPS服务器
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(3443, () => {
    console.log('HTTPS服务器运行在 https://localhost:3443');
});
```

## ⚠️ 浏览器警告

由于这是自签名证书，浏览器会显示安全警告：
- Chrome: "您的连接不是私密连接"
- Firefox: "连接不安全"
- Safari: "此连接不是私密连接"

**解决方法**：
1. 点击"高级"
2. 选择"继续前往localhost（不安全）"
3. 或添加例外/信任证书

## 🔄 重新生成证书

如果需要重新生成证书，运行：
```bash
cd config/certs
./generate_cert.sh
```

## 🛡️ 安全注意事项

1. **私钥保护**: key.pem文件权限已设置为600，只有所有者可读写
2. **生产环境**: 在生产环境中请使用由权威CA签发的证书
3. **证书更新**: 证书到期前请及时更新
4. **备份**: 建议备份私钥和证书文件

## 📝 证书验证命令

```bash
# 查看证书详细信息
openssl x509 -in cert.pem -text -noout

# 验证证书和私钥匹配
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5

# 检查证书有效期
openssl x509 -in cert.pem -noout -dates

# 验证证书格式
openssl x509 -in cert.pem -noout -fingerprint
```

## 🔄 格式转换

如果需要其他格式的证书：

```bash
# PEM转DER格式
openssl x509 -in cert.pem -outform DER -out cert.der
openssl rsa -in key.pem -outform DER -out key.der

# PEM转PKCS#12格式 (用于Windows IIS)
openssl pkcs12 -export -out certificate.p12 -inkey key.pem -in cert.pem

# 查看PKCS#12内容
openssl pkcs12 -info -in certificate.p12
```
