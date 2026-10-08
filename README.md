# 养老保险记录簿 · 纯展示版

无框架、无构建依赖的静态仪表盘。统一使用 confirmed-records.js 中的已确认记录，参考目标为 20 年。截止月份自动跟随北京时间当前月份。

页面无编辑、增删、导入、导出或清空操作，不读取或写入浏览器本地存储。记录更新需修改项目数据文件并重新发布。

测试：node tests/core.test.cjs；node tests/today.test.cjs；node tests/forecast.test.cjs。
