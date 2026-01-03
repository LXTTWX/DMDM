/**
 * 数据导入导出模块
 * 支持多种格式的学生数据导入导出功能
 */

class ImportExportManager {
    constructor() {
        this.supportedImportFormats = ['json', 'csv', 'xlsx', 'xls'];
        this.supportedExportFormats = ['csv', 'xlsx', 'png', 'jpeg'];
        this.sheetJSLoaded = false;
        this.html2canvasLoaded = false;
    }

    /**
     * 加载必要的第三方库
     */
    async loadLibraries() {
        await this.loadSheetJS();
        await this.loadHtml2Canvas();
    }

    /**
     * 加载 SheetJS 库用于 Excel 文件处理
     */
    async loadSheetJS() {
        if (this.sheetJSLoaded) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            script.onload = () => {
                this.sheetJSLoaded = true;
                console.log('SheetJS 库加载成功');
                resolve();
            };
            script.onerror = () => {
                console.warn('SheetJS 库加载失败，Excel 功能将不可用');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 加载 html2canvas 库用于图片导出
     */
    async loadHtml2Canvas() {
        if (this.html2canvasLoaded) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => {
                this.html2canvasLoaded = true;
                console.log('html2canvas 库加载成功');
                resolve();
            };
            script.onerror = () => {
                console.warn('html2canvas 库加载失败，图片导出功能将不可用');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 检测文件格式
     * @param {string} fileName - 文件名
     * @returns {string} 文件扩展名（小写）
     */
    detectFileFormat(fileName) {
        const parts = fileName.split('.');
        if (parts.length < 2) return '';
        return parts[parts.length - 1].toLowerCase();
    }

    /**
     * 验证导入文件格式
     * @param {string} format - 文件格式
     * @returns {boolean} 是否支持
     */
    isImportFormatSupported(format) {
        return this.supportedImportFormats.includes(format);
    }

    /**
     * 验证导出文件格式
     * @param {string} format - 文件格式
     * @returns {boolean} 是否支持
     */
    isExportFormatSupported(format) {
        return this.supportedExportFormats.includes(format);
    }

    /**
     * 读取文件内容
     * @param {File} file - 文件对象
     * @returns {Promise<string>} 文件内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            
            const format = this.detectFileFormat(file.name);
            if (['xlsx', 'xls'].includes(format)) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file, 'UTF-8');
            }
        });
    }

    /**
     * 解析 CSV 格式数据
     * @param {string} csvText - CSV 文本内容
     * @returns {Array} 解析后的数据数组
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV 文件格式错误：至少需要包含标题行和数据行');
        }

        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                const key = header.trim().toLowerCase().replace(/[\s\-_]/g, '_');
                row[key] = values[index] ? values[index].trim() : '';
            });
            
            data.push(row);
        }

        return data;
    }

    /**
     * 解析单行 CSV（处理引号和转义）
     * @param {string} line - CSV 行文本
     * @returns {Array} 解析后的字段数组
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * 解析 JSON 格式数据
     * @param {string} jsonText - JSON 文本内容
     * @returns {Array} 解析后的数据数组
     */
    parseJSON(jsonText) {
        const data = JSON.parse(jsonText);
        
        if (!Array.isArray(data)) {
            throw new Error('JSON 格式错误：数据必须是一个数组');
        }

        return data.map(item => {
            const normalizedItem = {};
            for (const key in item) {
                const normalizedKey = key.toLowerCase().replace(/[\s\-_]/g, '_');
                normalizedItem[normalizedKey] = item[key];
            }
            return normalizedItem;
        });
    }

    /**
     * 解析 Excel 格式数据
     * @param {ArrayBuffer} arrayBuffer - 文件内容
     * @returns {Array} 解析后的数据数组
     */
    parseExcel(arrayBuffer) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Excel 解析库未加载，请检查网络连接');
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
            throw new Error('Excel 文件格式错误：至少需要包含标题行和数据行');
        }

        const headers = jsonData[0].map(h => String(h).toLowerCase().replace(/[\s\-_]/g, '_'));
        const data = [];

        for (let i = 1; i < jsonData.length; i++) {
            if (!jsonData[i] || jsonData[i].length === 0) continue;
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = jsonData[i][index] ? String(jsonData[i][index]).trim() : '';
            });
            
            data.push(row);
        }

        return data;
    }

    /**
     * 将解析数据转换为学生数据格式
     * @param {Array} rawData - 解析后的原始数据
     * @returns {Array} 标准化后的学生数据数组
     */
    normalizeStudentData(rawData) {
        const normalizedData = [];
        const fieldMappings = {
            'name': ['name', '姓名', 'student_name', '学生姓名'],
            'student_id': ['student_id', 'studentid', '学号', 'id', '编号'],
            'phone': ['phone', 'tel', 'telephone', '电话', '手机'],
            'email': ['email', '邮箱', '电子邮件', 'mail'],
            'notes': ['notes', 'remark', '备注', '说明', '描述']
        };

        for (let i = 0; i < rawData.length; i++) {
            const item = rawData[i];
            const student = {
                name: '',
                studentId: '',
                phone: '',
                email: '',
                notes: ''
            };

            for (const [field, aliases] of Object.entries(fieldMappings)) {
                for (const alias of aliases) {
                    if (item[alias] !== undefined && item[alias] !== null) {
                        student[field] = item[alias];
                        break;
                    }
                }
            }

            if (!student.name) {
                console.warn(`第 ${i + 1} 条数据缺少学生姓名，已跳过`);
                continue;
            }

            normalizedData.push(student);
        }

        return normalizedData;
    }

    /**
     * 导入学生数据
     * @param {File} file - 导入的文件
     * @param {number} classId - 目标班级ID
     * @returns {Promise<Object>} 导入结果
     */
    async importStudents(file, classId) {
        const startTime = Date.now();
        const result = {
            success: true,
            totalRows: 0,
            importedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            errors: [],
            duration: 0
        };

        try {
            const format = this.detectFileFormat(file.name);
            
            if (!this.isImportFormatSupported(format)) {
                throw new Error(`不支持的文件格式: .${format}。支持的格式包括: ${this.supportedImportFormats.join(', ')}`);
            }

            const content = await this.readFileContent(file);
            let rawData;

            switch (format) {
                case 'csv':
                    rawData = this.parseCSV(content);
                    break;
                case 'json':
                    rawData = this.parseJSON(content);
                    break;
                case 'xlsx':
                case 'xls':
                    rawData = this.parseExcel(content);
                    break;
            }

            result.totalRows = rawData.length;
            const normalizedData = this.normalizeStudentData(rawData);

            const studentsData = normalizedData.map(data => ({
                classId: classId,
                name: data.name,
                studentId: data.studentId,
                phone: data.phone,
                email: data.email,
                notes: data.notes
            }));

            const importResult = await window.storageManager.addStudentsBatch(classId, studentsData);
            result.importedCount = importResult.success.length;
            result.skippedCount = importResult.success.length < studentsData.length ? 
                studentsData.length - importResult.success.length : 0;
            result.errors = importResult.errors;

            result.duration = Date.now() - startTime;
            console.log(`导入完成: 成功 ${result.importedCount} 条，耗时 ${result.duration}ms`);

        } catch (error) {
            result.success = false;
            result.errors.push({ error: error.message });
            console.error('导入失败:', error);
        }

        return result;
    }

    /**
     * 导出学生数据为 CSV 格式
     * @param {Array} students - 学生数据数组
     * @returns {string} CSV 格式的字符串
     */
    exportToCSV(students) {
        const headers = ['姓名', '学号', '电话', '邮箱', '备注', '点名次数', '最后点名时间'];
        const rows = [headers.join(',')];

        students.forEach(student => {
            const row = [
                this.escapeCSVField(student.name),
                this.escapeCSVField(student.studentId || ''),
                this.escapeCSVField(student.phone || ''),
                this.escapeCSVField(student.email || ''),
                this.escapeCSVField(student.notes || ''),
                student.callCount || 0,
                student.lastCalled ? new Date(student.lastCalled).toLocaleDateString('zh-CN') : '从未'
            ];
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * 转义 CSV 字段
     * @param {string} field - 字段值
     * @returns {string} 转义后的字段值
     */
    escapeCSVField(field) {
        if (!field) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * 导出学生数据为 Excel 格式
     * @param {Array} students - 学生数据数组
     * @returns {Uint8Array} Excel 文件数据
     */
    exportToExcel(students) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Excel 导出库未加载，请检查网络连接');
        }

        const data = students.map(student => ({
            '姓名': student.name,
            '学号': student.studentId || '',
            '电话': student.phone || '',
            '邮箱': student.email || '',
            '备注': student.notes || '',
            '点名次数': student.callCount || 0,
            '最后点名时间': student.lastCalled ? 
                new Date(student.lastCalled).toLocaleString('zh-CN') : '从未'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '学生名单');
        
        const columnWidths = [
            { wch: 10 },
            { wch: 15 },
            { wch: 15 },
            { wch: 25 },
            { wch: 30 },
            { wch: 10 },
            { wch: 20 }
        ];
        worksheet['!cols'] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Uint8Array(excelBuffer);
    }

    /**
     * 创建学生名单图片
     * @param {Array} students - 学生数据数组
     * @param {string} className - 班级名称
     * @returns {Promise<string>} 图片的 Base64 编码
     */
    async createStudentImage(students, className = '学生名单') {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 800px;
            background: white;
            padding: 40px;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        `;

        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333; margin: 0 0 10px 0; font-size: 28px;">${className}</h1>
                <p style="color: #666; margin: 0; font-size: 14px;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
                <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">
                    共 ${students.length} 人
                </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 40px;">序号</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">姓名</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 80px;">学号</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 120px;">电话</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 60px;">点名次数</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map((student, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#fff' : '#fafafa'};">
                            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${student.name}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${student.studentId || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${student.phone || '-'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${student.callCount || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
                <p style="margin: 3px 0;">Generated by 随机点名系统</p>
            </div>
        `;

        document.body.appendChild(container);

        try {
            if (typeof html2canvas === 'undefined') {
                throw new Error('图片生成库未加载，请检查网络连接');
            }

            const canvas = await html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            return canvas.toDataURL('image/png', 1.0);
        } finally {
            document.body.removeChild(container);
        }
    }

    /**
     * 下载文件
     * @param {Blob} blob - 文件 Blob 对象
     * @param {string} fileName - 文件名
     */
    downloadFile(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * 导出学生数据
     * @param {Array} students - 学生数据数组
     * @param {string} format - 导出格式 (csv, xlsx, png, jpeg)
     * @param {string} className - 班级名称（用于文件名和图片标题）
     * @returns {Promise<Object>} 导出结果
     */
    async exportStudents(students, format, className = 'students') {
        const result = {
            success: true,
            format: format,
            fileName: '',
            error: null
        };

        try {
            const timestamp = new Date().toISOString().slice(0, 10);
            let fileName = `${className}_学生名单_${timestamp}`;
            let blob;

            switch (format) {
                case 'csv':
                    const csvContent = this.exportToCSV(students);
                    blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
                    fileName += '.csv';
                    break;

                case 'xlsx':
                    const excelBuffer = this.exportToExcel(students);
                    blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    fileName += '.xlsx';
                    break;

                case 'png':
                case 'jpeg':
                    const imageDataUrl = await this.createStudentImage(students, className);
                    const base64Data = imageDataUrl.split(',')[1];
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    blob = new Blob([byteArray], { type: `image/${format}` });
                    fileName += `.${format}`;
                    break;

                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

            this.downloadFile(blob, fileName);
            result.fileName = fileName;
            console.log(`导出成功: ${fileName}`);

        } catch (error) {
            result.success = false;
            result.error = error.message;
            console.error('导出失败:', error);
        }

        return result;
    }

    /**
     * 获取导入模板
     * @param {string} format - 模板格式 (csv, json)
     * @returns {string|Object} 模板内容
     */
    getImportTemplate(format) {
        const templateData = [
            { 姓名: '张三', 学号: '2024001', 电话: '13800138001', 邮箱: 'zhangsan@example.com', 备注: '' },
            { 姓名: '李四', 学号: '2024002', 电话: '13800138002', 邮箱: 'lisi@example.com', 备注: '优秀学生' }
        ];

        if (format === 'json') {
            return JSON.stringify(templateData, null, 2);
        } else if (format === 'csv') {
            const headers = Object.keys(templateData[0]);
            const rows = [headers.join(',')];
            templateData.forEach(item => {
                rows.push(headers.map(h => this.escapeCSVField(item[h])).join(','));
            });
            return rows.join('\n');
        }

        return null;
    }

    /**
     * 下载导入模板
     * @param {string} format - 模板格式
     */
    downloadImportTemplate(format) {
        const content = this.getImportTemplate(format);
        if (!content) return;

        const blob = new Blob([format === 'csv' ? new Uint8Array([0xEF, 0xBB, 0xBF]) : '', content], {
            type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json'
        });

        this.downloadFile(blob, `学生导入模板.${format}`);
    }
}

/**
 * 显示导入学生模态框
 */
async function showImportStudentsModal() {
    await window.importExportManager.loadLibraries();

    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const confirm = document.getElementById('modalConfirm');

    title.textContent = '导入学生数据';

    body.innerHTML = `
        <div class="import-section">
            <div class="form-group">
                <label>选择文件 <span class="required">*</span></label>
                <input type="file" id="importFile" accept=".json,.csv,.xlsx,.xls" />
                <small style="color: #666;">支持格式: JSON, CSV, Excel (.xlsx, .xls)</small>
            </div>

            <div class="form-group">
                <label>导入说明</label>
                <ul class="import-tips">
                    <li>文件必须包含学生姓名（必填）</li>
                    <li>可选字段：学号、电话、邮箱、备注</li>
                    <li>系统将自动识别常用字段名</li>
                </ul>
            </div>

            <div class="form-group">
                <label>下载模板</label>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn btn-outline" onclick="window.importExportManager.downloadImportTemplate('csv')">
                        CSV 模板
                    </button>
                    <button type="button" class="btn btn-outline" onclick="window.importExportManager.downloadImportTemplate('json')">
                        JSON 模板
                    </button>
                </div>
            </div>

            <div id="importProgress" class="import-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <p class="progress-text">准备中...</p>
            </div>

            <div id="importResult" class="import-result" style="display: none;"></div>
        </div>
    `;

    confirm.textContent = '开始导入';
    confirm.onclick = () => {
        startImport();
    };

    modal.style.display = 'flex';
}

/**
 * 开始导入学生数据
 */
async function startImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择要导入的文件');
        return;
    }

    const progressDiv = document.getElementById('importProgress');
    const resultDiv = document.getElementById('importResult');
    const confirmBtn = document.getElementById('modalConfirm');

    progressDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = '导入中...';

    try {
        const classId = app.currentClassId;
        if (!classId) {
            throw new Error('请先选择目标班级');
        }

        const result = await window.importExportManager.importStudents(file, classId);

        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        if (result.success) {
            resultDiv.innerHTML = `
                <div class="result-success">
                    <h4>导入完成</h4>
                    <p>总计行数: ${result.totalRows}</p>
                    <p>成功导入: ${result.importedCount} 条</p>
                    <p>耗时: ${result.duration}ms</p>
                    ${result.errors.length > 0 ? `
                        <p style="color: #f39c12;">跳过 ${result.errors.length} 条（数据重复或格式错误）</p>
                    ` : ''}
                </div>
            `;

            await app.loadStudents();
        } else {
            resultDiv.innerHTML = `
                <div class="result-error">
                    <h4>导入失败</h4>
                    <p>${result.errors[0]?.error || '未知错误'}</p>
                </div>
            `;
        }

    } catch (error) {
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="result-error">
                <h4>导入失败</h4>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '开始导入';
    }
}

/**
 * 显示导出学生数据模态框
 */
async function showExportStudentsModal() {
    await window.importExportManager.loadLibraries();

    if (!app.currentClassId) {
        app.showNotification('请先选择班级', 'warning');
        return;
    }

    const students = app.currentStudents;
    if (students.length === 0) {
        app.showNotification('当前班级没有学生数据', 'warning');
        return;
    }

    const cls = await window.storageManager.getClassById(app.currentClassId);
    const className = cls ? cls.name : '未知班级';

    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const confirm = document.getElementById('modalConfirm');

    title.textContent = '导出学生数据';

    body.innerHTML = `
        <div class="export-section">
            <div class="export-info">
                <p>班级: <strong>${className}</strong></p>
                <p>学生人数: <strong>${students.length}</strong> 人</p>
            </div>

            <div class="form-group">
                <label>选择导出格式 <span class="required">*</span></label>
                <div class="export-format-options">
                    <label class="format-option">
                        <input type="radio" name="exportFormat" value="csv" checked />
                        <span class="format-icon">📄</span>
                        <span class="format-name">CSV</span>
                        <span class="format-desc">通用表格格式</span>
                    </label>
                    <label class="format-option">
                        <input type="radio" name="exportFormat" value="xlsx" />
                        <span class="format-icon">📊</span>
                        <span class="format-name">Excel</span>
                        <span class="format-desc">Office 表格</span>
                    </label>
                    <label class="format-option">
                        <input type="radio" name="exportFormat" value="png" />
                        <span class="format-icon">🖼️</span>
                        <span class="format-name">PNG 图片</span>
                        <span class="format-desc">高清图片</span>
                    </label>
                    <label class="format-option">
                        <input type="radio" name="exportFormat" value="jpeg" />
                        <span class="format-icon">🖼️</span>
                        <span class="format-name">JPEG 图片</span>
                        <span class="format-desc">压缩图片</span>
                    </label>
                </div>
            </div>

            <div id="exportProgress" class="import-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <p class="progress-text">正在生成文件...</p>
            </div>

            <div id="exportResult" class="import-result" style="display: none;"></div>
        </div>
    `;

    confirm.textContent = '确认导出';
    confirm.onclick = () => {
        startExport(className);
    };

    modal.style.display = 'flex';
}

/**
 * 开始导出学生数据
 */
async function startExport(className) {
    const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv';
    const students = app.currentStudents;
    const progressDiv = document.getElementById('exportProgress');
    const resultDiv = document.getElementById('exportResult');
    const confirmBtn = document.getElementById('modalConfirm');

    progressDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = '导出中...';

    try {
        const result = await window.importExportManager.exportStudents(students, format, className);

        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';

        if (result.success) {
            resultDiv.innerHTML = `
                <div class="result-success">
                    <h4>导出成功</h4>
                    <p>文件名: ${result.fileName}</p>
                    <p>文件已自动下载</p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result-error">
                    <h4>导出失败</h4>
                    <p>${result.error || '未知错误'}</p>
                    <p>建议：检查网络连接后重试</p>
                </div>
            `;
        }

    } catch (error) {
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="result-error">
                <h4>导出失败</h4>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确认导出';
    }
}

// 创建全局实例
window.importExportManager = new ImportExportManager();