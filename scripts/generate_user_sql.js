/*
 * 生成批量插入 users 表的 SQL（含 bcrypt 哈希），输出到 stdout。
 * 用法：node scripts/generate_user_sql.js | mysql -h <host> -u <user> -p<pass> -D <db>
 */
const bcrypt = require('bcrypt');

const users = [
  { name: '上海大学', pwd: 'Secms&Measure@01', role: 'school' },
  { name: '上海理工大学', pwd: 'Secms&Measure@02', role: 'school' },
  { name: '上海海事大学', pwd: 'Secms&Measure@03', role: 'school' },
  { name: '上海海洋大学', pwd: 'Secms&Measure@04', role: 'school' },
  { name: '上海中医药大学', pwd: 'Secms&Measure@05', role: 'school' },
  { name: '上海师范大学', pwd: 'Secms&Measure@06', role: 'school' },
  { name: '上海对外经贸大学', pwd: 'Secms&Measure@07', role: 'school' },
  { name: '华东政法大学', pwd: 'Secms&Measure@08', role: 'school' },
  { name: '上海工程技术大学', pwd: 'Secms&Measure@09', role: 'school' },
  { name: '上海电力大学', pwd: 'Secms&Measure@10', role: 'school' },
  { name: '上海应用技术大学', pwd: 'Secms&Measure@11', role: 'school' },
  { name: '上海科技大学', pwd: 'Secms&Measure@12', role: 'school' },
  { name: '上海第二工业大学', pwd: 'Secms&Measure@13', role: 'school' },
  { name: '上海健康医学院', pwd: 'Secms&Measure@14', role: 'school' },
  { name: '上海体育大学', pwd: 'Secms&Measure@15', role: 'school' },
  { name: '上海音乐学院', pwd: 'Secms&Measure@16', role: 'school' },
  { name: '上海戏剧学院', pwd: 'Secms&Measure@17', role: 'school' },
  { name: '上海立信会计金融学院', pwd: 'Secms&Measure@18', role: 'school' },
  { name: '上海电机学院', pwd: 'Secms&Measure@19', role: 'school' },
  { name: '上海政法学院', pwd: 'Secms&Measure@20', role: 'school' },
  { name: '上海商学院', pwd: 'Secms&Measure@21', role: 'school' },
  { name: '上海交通大学医学院', pwd: 'Secms&Measure@22', role: 'school' },
  { name: '上海旅游高等专科学校', pwd: 'Secms&Measure@23', role: 'school' },
  { name: '上海出版印刷高等专科学校', pwd: 'Secms&Measure@24', role: 'school' },
  { name: '上海城建职业学院', pwd: 'Secms&Measure@25', role: 'school' },
  { name: '上海电子信息职业技术学院', pwd: 'Secms&Measure@26', role: 'school' },
  { name: '上海工艺美术职业学院', pwd: 'Secms&Measure@27', role: 'school' },
  { name: '上海农林职业技术学院', pwd: 'Secms&Measure@28', role: 'school' },
  { name: '上海健康医学院附属卫生学校(上海健康护理职业学院(筹))', pwd: 'Secms&Measure@29', role: 'school' },
  { name: '上海市教育基建管理中心', pwd: 'Secms&Measure@jjzx', role: 'construction_center' }
];

function esc(str) {
  // 将反斜杠与单引号进行转义以用于 SQL 字符串
  return str.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

(async () => {
  const rounds = 10;
  const values = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.pwd, rounds);
    const username = esc(u.name);
    const realName = esc(u.name);
    const role = u.role;
    const schoolNameFinal = role === 'school' ? `'${username}'` : 'NULL';
    values.push(`('${username}','${hash}','${realName}','${role}',${schoolNameFinal},'active')`);
  }
  const sql = `SET NAMES utf8mb4;\nINSERT INTO users (username,password,real_name,role,school_name,status) VALUES\n${values.join(',\n')}\nON DUPLICATE KEY UPDATE\n  password=VALUES(password),\n  real_name=VALUES(real_name),\n  role=VALUES(role),\n  school_name=VALUES(school_name),\n  status=VALUES(status);`;
  process.stdout.write(sql + "\n");
})().catch(err => { console.error(err); process.exit(1); });
