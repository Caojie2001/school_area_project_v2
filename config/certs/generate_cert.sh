#!/bin/bash

# SSL证书生成脚本
# 生成用于开发环境的自签名证书，修复密钥用法兼容性问题

echo "正在生成SSL证书..."

# 生成私钥
echo "1. 生成私钥 (key.pem)..."
openssl genrsa -out key.pem 2048

# 创建证书配置文件
echo "2. 创建证书配置文件..."
cat > cert.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=CN
ST=Beijing
L=Beijing
O=School Area Management System
OU=IT Department
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment, keyAgreement
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# 生成证书签名请求
echo "3. 生成证书签名请求..."
openssl req -new -key key.pem -out cert.csr -config cert.conf

# 生成自签名证书
echo "4. 生成自签名证书..."
openssl x509 -req -in cert.csr -signkey key.pem -out cert.pem -days 365 -extensions v3_req -extfile cert.conf

# 清理临时文件
rm cert.csr cert.conf

# 设置适当的权限
echo "5. 设置文件权限..."
chmod 600 key.pem
chmod 644 cert.pem

echo ""
echo "SSL证书生成完成!"
echo "私钥文件: key.pem"
echo "证书文件: cert.pem"
echo "证书有效期: 365天"

# 验证证书
echo ""
echo "验证证书信息:"
openssl x509 -in cert.pem -text -noout | grep -A 5 "X509v3 extensions"
echo ""
openssl x509 -in cert.pem -text -noout | grep -A 3 "Subject Alternative Name"
echo ""
echo "证书生成完成，可以启动HTTPS服务器了。"
echo "注意: 这是自签名证书，浏览器会显示安全警告，这是正常的。"
