/*
 * 批量创建学校用户 & 建设中心用户脚本
 * 使用：node scripts/seed_users.js
 * 说明：从 .env 读取数据库连接，向 users 表插入/更新指定用户
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const rawUsers = [
  { name: '上海大学', pwd: 'Secms&Measure@01' },
  { name: '上海理工大学', pwd: 'Secms&Measure@02' },
  { name: '上海海事大学', pwd: 'Secms&Measure@03' },
  { name: '上海海洋大学', pwd: 'Secms&Measure@04' },
  { name: '上海中医药大学', pwd: 'Secms&Measure@05' },
  { name: '上海师范大学', pwd: 'Secms&Measure@06' },
  { name: '上海对外经贸大学', pwd: 'Secms&Measure@07' },
  { name: '华东政法大学', pwd: 'Secms&Measure@08' },
  { name: '上海工程技术大学', pwd: 'Secms&Measure@09' },
  { name: '上海电力大学', pwd: 'Secms&Measure@10' },
  { name: '上海应用技术大学', pwd: 'Secms&Measure@11' },
  { name: '上海科技大学', pwd: 'Secms&Measure@12' },
  { name: '上海第二工业大学', pwd: 'Secms&Measure@13' },
  { name: '上海健康医学院', pwd: 'Secms&Measure@14' },
  { name: '上海体育大学', pwd: 'Secms&Measure@15' },
  { name: '上海音乐学院', pwd: 'Secms&Measure@16' },
  { name: '上海戏剧学院', pwd: 'Secms&Measure@17' },
  { name: '上海立信会计金融学院', pwd: 'Secms&Measure@18' },
  { name: '上海电机学院', pwd: 'Secms&Measure@19' },
  { name: '上海政法学院', pwd: 'Secms&Measure@20' },
  { name: '上海商学院', pwd: 'Secms&Measure@21' },
  { name: '上海交通大学医学院', pwd: 'Secms&Measure@22' },
  { name: '上海旅游高等专科学校', pwd: 'Secms&Measure@23' },
  { name: '上海出版印刷高等专科学校', pwd: 'Secms&Measure@24' },
  { name: '上海城建职业学院', pwd: 'Secms&Measure@25' },
  { name: '上海电子信息职业技术学院', pwd: 'Secms&Measure@26' },
  { name: '上海工艺美术职业学院', pwd: 'Secms&Measure@27' },
  { name: '上海农林职业技术学院', pwd: 'Secms&Measure@28' },
  { name: '上海健康医学院附属卫生学校(上海健康护理职业学院(筹))', pwd: 'Secms&Measure@29' },
  // 最后一个为建设中心角色
  { name: '上海市教育基建管理中心', pwd: 'Secms&Measure@jjzx', role: 'construction_center' }
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4_general_ci'
  });

  try {
    console.log('连接数据库成功，开始生成密码哈希…');
    const prepared = await Promise.all(
      rawUsers.map(async (u, idx) => {
        const role = u.role || 'school';
        const passwordHash = await bcrypt.hash(u.pwd, BCRYPT_ROUNDS);
        const schoolName = role === 'school' ? u.name : null;
        return {
          username: u.name,
          password: passwordHash,
          real_name: u.name,
          role,
          school_name: schoolName,
          status: 'active'
        };
      })
    );

    // 构建批量插入SQL
    const cols = ['username', 'password', 'real_name', 'role', 'school_name', 'status'];
    const placeholders = prepared.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    const sql = `INSERT INTO users (${cols.join(',')}) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE 
        password=VALUES(password),
        real_name=VALUES(real_name),
        role=VALUES(role),
        school_name=VALUES(school_name),
        status=VALUES(status)`;

    const params = [];
    for (const u of prepared) {
      params.push(u.username, u.password, u.real_name, u.role, u.school_name, u.status);
    }

    const [result] = await conn.execute(sql, params);
    console.log('用户写入完成。受影响行数:', result.affectedRows);

    // 简要校验
    const [rows] = await conn.query(
      `SELECT username, role, IFNULL(school_name, '') AS school_name FROM users 
       WHERE username IN (${prepared.map(() => '?').join(',')}) ORDER BY username`,
      prepared.map(u => u.username)
    );
    console.table(rows);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('写入用户失败:', err);
  process.exit(1);
});
