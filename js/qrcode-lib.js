// 可靠的二维码生成库
// 使用多个CDN源确保稳定性

(function() {
    'use strict';
    
    // 加载外部二维码库的函数
    function loadQRCodeLibrary() {
        return new Promise((resolve, reject) => {
            // 尝试的CDN列表
            const cdnList = [
                'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
                'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js'
            ];
            
            let currentIndex = 0;
            
            function tryLoadCDN() {
                if (currentIndex >= cdnList.length) {
                    reject(new Error('所有CDN都无法加载'));
                    return;
                }
                
                const script = document.createElement('script');
                script.src = cdnList[currentIndex];
                script.onload = function() {
                    console.log(`✅ 二维码库加载成功: ${cdnList[currentIndex]}`);
                    resolve();
                };
                script.onerror = function() {
                    console.log(`❌ CDN加载失败: ${cdnList[currentIndex]}`);
                    currentIndex++;
                    setTimeout(tryLoadCDN, 100); // 短暂延迟后尝试下一个CDN
                };
                document.head.appendChild(script);
            }
            
            tryLoadCDN();
        });
    }
    
    // 简化的备用二维码生成器
    class FallbackQRCode {
        constructor() {
            this.canvas = null;
        }
        
        static generate(text, canvas, options = {}) {
            // 创建一个简单的二维码模式
            const size = options.width || 200;
            const ctx = canvas.getContext('2d');
            
            canvas.width = size;
            canvas.height = size;
            
            // 清空画布
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            
            // 绘制边框
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, size, 10);
            ctx.fillRect(0, 0, 10, size);
            ctx.fillRect(size - 10, 0, 10, size);
            ctx.fillRect(0, size - 10, size, 10);
            
            // 绘制中心文本
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('请刷新页面', size / 2, size / 2 - 10);
            ctx.fillText('重新加载二维码', size / 2, size / 2 + 10);
            
            // 绘制一些装饰性图案
            for (let i = 20; i < size - 20; i += 20) {
                for (let j = 20; j < size - 20; j += 20) {
                    if ((i + j) % 40 === 0) {
                        ctx.fillRect(i, j, 8, 8);
                    }
                }
            }
            
            return Promise.resolve();
        }
    }
    
    // 初始化函数
    async function initializeQRCode() {
        try {
            // 如果QRCode已经存在，直接返回
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                console.log('✅ 二维码库已存在');
                window.QRCodeReady = true;
                return;
            }
            
            // 尝试加载外部库
            await loadQRCodeLibrary();
            
            // 验证加载是否成功
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                window.QRCodeReady = true;
                console.log('✅ 二维码库初始化成功');
            } else {
                throw new Error('库加载后QRCode对象不可用');
            }
            
        } catch (error) {
            console.warn('⚠️ 外部二维码库加载失败，使用备用方案:', error.message);
            
            // 使用备用方案
            window.QRCode = {
                toCanvas: function(canvas, text, options, callback) {
                    try {
                        const opts = typeof options === 'function' ? {} : options || {};
                        const cb = typeof options === 'function' ? options : callback;
                        
                        FallbackQRCode.generate(text, canvas, opts).then(() => {
                            if (cb) cb(null);
                        }).catch(err => {
                            if (cb) cb(err);
                        });
                        
                        return Promise.resolve();
                    } catch (err) {
                        if (callback || typeof options === 'function') {
                            const cb = typeof options === 'function' ? options : callback;
                            setTimeout(() => cb(err), 0);
                        }
                        return Promise.reject(err);
                    }
                },
                
                create: function(text, options = {}) {
                    return { text: text, options: options };
                },
                
                CorrectLevel: {
                    L: 1,
                    M: 0,
                    Q: 3,
                    H: 2
                }
            };
            
            window.QRCodeReady = true;
            console.log('✅ 备用二维码方案已激活');
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeQRCode);
    } else {
        initializeQRCode();
    }
    
    // 导出初始化函数供手动调用
    window.initQRCode = initializeQRCode;
    
})();

// 页面刷新二维码的辅助函数
window.refreshQRCodes = function() {
    console.log('🔄 刷新二维码库...');
    
    // 删除现有的QRCode对象
    delete window.QRCode;
    delete window.QRCodeReady;
    
    // 重新初始化
    window.initQRCode().then(() => {
        console.log('✅ 二维码库已刷新');
        
        // 如果有音频生成器实例，重新生成所有二维码
        if (window.generator && window.generator.audioFiles && window.generator.audioFiles.length > 0) {
            console.log('🔄 重新生成所有二维码...');
            window.generator.generateAllQR();
        }
    }).catch(err => {
        console.error('❌ 二维码库刷新失败:', err);
    });
};

console.log('📦 二维码加载器已准备就绪'); 
