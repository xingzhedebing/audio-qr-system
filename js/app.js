class AudioQRGenerator {
    constructor() {
        this.cos = null;
        this.audioFiles = [];
        this.qrCodes = new Map();
        this.basePlayUrl = window.location.origin + '/play.html';
        this.generatedCount = 0;
        
        // 初始化时尝试加载配置
        this.loadConfigFromFile();
    }

    // 从配置文件加载配置
    loadConfigFromFile() {
        if (typeof CONFIG !== 'undefined' && CONFIG.TENCENT_CLOUD) {
            const config = CONFIG.TENCENT_CLOUD;
            if (config.SECRET_ID !== 'YOUR_SECRET_ID_HERE') {
                document.getElementById('secretId').value = config.SECRET_ID;
                document.getElementById('secretKey').value = config.SECRET_KEY;
                document.getElementById('bucket').value = config.BUCKET;
                document.getElementById('region').value = config.REGION;
                
                this.showMessage('配置文件加载成功！', 'success');
            }
        }
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // 插入到页面顶部
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 3000);
    }

    // 显示加载状态
    showLoading(show = true) {
        const loadingSection = document.getElementById('loadingSection');
        loadingSection.style.display = show ? 'block' : 'none';
    }

    // 更新统计信息
    updateStats() {
        const totalSize = this.audioFiles.reduce((sum, file) => sum + file.Size, 0);
        
        document.getElementById('totalFiles').textContent = this.audioFiles.length;
        document.getElementById('totalSize').textContent = (totalSize / 1024 / 1024).toFixed(2);
        document.getElementById('generatedQR').textContent = this.generatedCount;
        
        const statsSection = document.getElementById('statsSection');
        const actionsSection = document.getElementById('actionsSection');
        
        if (this.audioFiles.length > 0) {
            statsSection.style.display = 'flex';
            actionsSection.style.display = 'block';
        }
    }

    // 初始化腾讯云COS
    initCOS() {
        const secretId = document.getElementById('secretId').value.trim();
        const secretKey = document.getElementById('secretKey').value.trim();
        
        if (!secretId || !secretKey) {
            throw new Error('请输入完整的API密钥信息');
        }
        
        this.cos = new COS({
            SecretId: secretId,
            SecretKey: secretKey
        });
    }

    // 测试连接
    async testConnection() {
        try {
            this.initCOS();
            const bucket = document.getElementById('bucket').value.trim();
            const region = document.getElementById('region').value;
            
            if (!bucket) {
                throw new Error('请输入存储桶名称');
            }
            
            // 测试获取存储桶信息
            await this.cos.headBucket({
                Bucket: bucket,
                Region: region
            });
            
            this.showMessage('连接测试成功！', 'success');
        } catch (error) {
            console.error('连接测试失败:', error);
            this.showMessage(`连接测试失败: ${error.message}`, 'error');
        }
    }

    // 加载音频文件列表
    async loadAudioFiles() {
        try {
            this.showLoading(true);
            this.initCOS();
            
            const bucket = document.getElementById('bucket').value.trim();
            const region = document.getElementById('region').value;

            if (!bucket) {
                throw new Error('请输入存储桶名称');
            }

            const result = await this.cos.getBucket({
                Bucket: bucket,
                Region: region,
                Prefix: '',
                MaxKeys: 1000
            });

            // 过滤音频文件
            const audioExtensions = ['.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg'];
            this.audioFiles = result.Contents.filter(file => {
                const ext = file.Key.toLowerCase();
                return audioExtensions.some(extension => ext.endsWith(extension));
            });

            if (this.audioFiles.length === 0) {
                this.showMessage('未找到音频文件，请检查存储桶中是否有音频文件', 'warning');
            } else {
                this.showMessage(`成功加载 ${this.audioFiles.length} 个音频文件`, 'success');
            }

            this.renderAudioList();
            this.updateStats();
            
        } catch (error) {
            console.error('加载文件失败:', error);
            this.showMessage(`加载失败: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 渲染音频文件列表
    renderAudioList() {
        const container = document.getElementById('audioList');
        container.innerHTML = '';

        if (this.audioFiles.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无音频文件</div>';
            return;
        }

        this.audioFiles.forEach((file, index) => {
            const fileName = file.Key.split('/').pop();
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            const fileSize = (file.Size / 1024 / 1024).toFixed(2);
            const lastModified = new Date(file.LastModified).toLocaleString();
            
            const item = document.createElement('div');
            item.className = 'audio-item';
            item.innerHTML = `
                <div class="file-info">
                    <input type="checkbox" class="qr-checkbox" id="checkbox-${index}" onchange="generator.updateSelection()">
                    <label for="checkbox-${index}">
                        <h4 title="${fileName}">${fileName}</h4>
                        <div class="file-meta">
                            <span class="file-size">📁 ${fileSize} MB</span>
                            <span class="file-date">🕒 ${lastModified}</span>
                        </div>
                    </label>
                </div>
                <div class="qr-section">
                    <div class="qr-container">
                        <canvas id="qr-${index}" width="200" height="200"></canvas>
                        <div class="qr-status" id="status-${index}">未生成</div>
                    </div>
                    <div class="qr-actions">
                        <button onclick="generator.generateSingleQR(${index})" class="btn-small btn-primary">
                            🎯 生成二维码
                        </button>
                        <button onclick="generator.downloadSingleQR(${index}, '${fileNameWithoutExt}')" class="btn-small btn-success">
                            📥 下载
                        </button>
                        <button onclick="generator.previewAudio('${file.Key}')" class="btn-small btn-secondary">
                            🎵 预览
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // 生成单个二维码
    async generateSingleQR(index) {
        try {
            const file = this.audioFiles[index];
            const bucket = document.getElementById('bucket').value.trim();
            const region = document.getElementById('region').value;
            
            // 构建音频访问URL
            const audioUrl = `https://${bucket}.cos.${region}.myqcloud.com/${file.Key}`;
            
            // 构建播放页面URL
            const fileName = file.Key.split('/').pop();
            const playUrl = `${this.basePlayUrl}?audio=${encodeURIComponent(audioUrl)}&title=${encodeURIComponent(fileName)}`;
            
            // 更新状态
            const statusElement = document.getElementById(`status-${index}`);
            statusElement.textContent = '生成中...';
            statusElement.className = 'qr-status generating';
            
            // 生成二维码
            const canvas = document.getElementById(`qr-${index}`);
            await QRCode.toCanvas(canvas, playUrl, {
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff',
                margin: 4
            });
            
            // 保存二维码数据
            this.qrCodes.set(index, {
                dataURL: canvas.toDataURL(),
                fileName: file.Key.split('/').pop().replace(/\.[^/.]+$/, ""),
                playUrl: playUrl
            });
            
            // 更新状态
            statusElement.textContent = '已生成';
            statusElement.className = 'qr-status generated';
            
            // 自动选中生成的二维码
            const checkbox = document.getElementById(`checkbox-${index}`);
            checkbox.checked = true;
            
            // 更新计数
            this.generatedCount++;
            this.updateStats();
            this.updateSelection();
            
        } catch (error) {
            console.error('二维码生成失败:', error);
            const statusElement = document.getElementById(`status-${index}`);
            statusElement.textContent = '生成失败';
            statusElement.className = 'qr-status error';
            this.showMessage(`二维码生成失败: ${error.message}`, 'error');
        }
    }

    // 更新选择状态
    updateSelection() {
        const checkboxes = document.querySelectorAll('.qr-checkbox');
        const checked = document.querySelectorAll('.qr-checkbox:checked');
        const selectedCount = checked.length;
        
        // 更新全选按钮文本
        const selectAllBtn = document.querySelector('button[onclick="selectAllQR()"]');
        if (selectAllBtn) {
            if (selectedCount === 0) {
                selectAllBtn.textContent = '☑️ 全选二维码';
            } else if (selectedCount === checkboxes.length) {
                selectAllBtn.textContent = '🔲 取消全选';
            } else {
                selectAllBtn.textContent = `☑️ 已选${selectedCount}个`;
            }
        }
        
        // 更新下载选中按钮状态
        const downloadSelectedBtn = document.querySelector('button[onclick="downloadSelectedQR()"]');
        if (downloadSelectedBtn) {
            downloadSelectedBtn.disabled = selectedCount === 0;
            downloadSelectedBtn.textContent = selectedCount > 0 ? `📦 下载选中(${selectedCount})` : '📦 下载选中';
        }
    }

    // 全选/取消全选二维码
    selectAllQR() {
        const checkboxes = document.querySelectorAll('.qr-checkbox');
        const checkedCount = document.querySelectorAll('.qr-checkbox:checked').length;
        const shouldSelectAll = checkedCount !== checkboxes.length;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = shouldSelectAll;
        });
        
        this.updateSelection();
        this.showMessage(shouldSelectAll ? '已全选所有二维码' : '已取消全选', 'info');
    }

    // 下载选中的二维码
    async downloadSelectedQR() {
        const checkedBoxes = document.querySelectorAll('.qr-checkbox:checked');
        let downloadCount = 0;
        
        for (const checkbox of checkedBoxes) {
            const index = parseInt(checkbox.id.replace('checkbox-', ''));
            if (this.qrCodes.has(index)) {
                const qrData = this.qrCodes.get(index);
                
                const link = document.createElement('a');
                link.download = `${qrData.fileName}_qr.png`;
                link.href = qrData.dataURL;
                link.click();
                
                downloadCount++;
                
                // 添加延迟避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        if (downloadCount === 0) {
            this.showMessage('没有可下载的二维码，请先生成二维码', 'warning');
        } else {
            this.showMessage(`已下载 ${downloadCount} 个二维码`, 'success');
        }
    }

    // 生成所有二维码
    async generateAllQR() {
        this.showMessage('开始批量生成二维码...', 'info');
        
        for (let i = 0; i < this.audioFiles.length; i++) {
            await this.generateSingleQR(i);
            // 添加小延迟避免过快请求
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.showMessage('所有二维码生成完成！', 'success');
    }

    // 下载单个二维码
    downloadSingleQR(index, fileName) {
        if (!this.qrCodes.has(index)) {
            this.showMessage('请先生成二维码', 'warning');
            return;
        }

        const qrData = this.qrCodes.get(index);
        const link = document.createElement('a');
        link.download = `${fileName || qrData.fileName}_qr.png`;
        link.href = qrData.dataURL;
        link.click();
        
        this.showMessage(`二维码已下载: ${fileName || qrData.fileName}_qr.png`, 'success');
    }

    // 批量下载所有二维码
    async downloadAllQR() {
        let downloadCount = 0;
        
        for (let i = 0; i < this.audioFiles.length; i++) {
            if (this.qrCodes.has(i)) {
                const qrData = this.qrCodes.get(i);
                
                const link = document.createElement('a');
                link.download = `${qrData.fileName}_qr.png`;
                link.href = qrData.dataURL;
                link.click();
                
                downloadCount++;
                
                // 添加延迟避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        if (downloadCount === 0) {
            this.showMessage('没有可下载的二维码，请先生成二维码', 'warning');
        } else {
            this.showMessage(`已下载 ${downloadCount} 个二维码`, 'success');
        }
    }

    // 预览音频
    previewAudio(fileKey) {
        const bucket = document.getElementById('bucket').value.trim();
        const region = document.getElementById('region').value;
        const audioUrl = `https://${bucket}.cos.${region}.myqcloud.com/${fileKey}`;
        const fileName = fileKey.split('/').pop();
        
        // 创建预览窗口
        const previewWindow = window.open('', '_blank', 'width=400,height=300');
        previewWindow.document.write(`
            <html>
                <head>
                    <title>音频预览 - ${fileName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                        audio { width: 100%; margin: 20px 0; }
                        h3 { color: #333; }
                    </style>
                </head>
                <body>
                    <h3>🎵 ${fileName}</h3>
                    <audio controls autoplay>
                        <source src="${audioUrl}" type="audio/mpeg">
                        您的浏览器不支持音频播放。
                    </audio>
                    <br>
                    <button onclick="window.close()">关闭</button>
                </body>
            </html>
        `);
    }

    // 清空所有
    clearAll() {
        if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
            this.audioFiles = [];
            this.qrCodes.clear();
            this.generatedCount = 0;
            
            document.getElementById('audioList').innerHTML = '';
            document.getElementById('statsSection').style.display = 'none';
            document.getElementById('actionsSection').style.display = 'none';
            
            this.showMessage('已清空所有数据', 'info');
        }
    }
}

// 全局实例
const generator = new AudioQRGenerator();

// 全局函数
function loadConfig() {
    generator.loadConfigFromFile();
}

function testConnection() {
    generator.testConnection();
}

function loadAudioFiles() {
    generator.loadAudioFiles();
}

function generateAllQR() {
    generator.generateAllQR();
}

function downloadAllQR() {
    generator.downloadAllQR();
}

function clearAll() {
    generator.clearAll();
}

function selectAllQR() {
    generator.selectAllQR();
}

function downloadSelectedQR() {
    generator.downloadSelectedQR();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否支持必要的API
    if (!window.QRCode) {
        generator.showMessage('二维码库加载失败，请检查网络连接', 'error');
    }
    
    if (!window.COS) {
        generator.showMessage('腾讯云SDK加载失败，请检查网络连接', 'error');
    }
    
    // 添加键盘快捷键
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
            switch(e.key) {
                case 'l':
                    e.preventDefault();
                    loadAudioFiles();
                    break;
                case 'g':
                    e.preventDefault();
                    generateAllQR();
                    break;
                case 'd':
                    e.preventDefault();
                    downloadAllQR();
                    break;
            }
        }
    });
}); 
