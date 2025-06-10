// GitHub Pages 配置文件
// 适用于GitHub Pages部署的配置
// 仓库名：audio-qr-system

const CONFIG = {
    // 腾讯云配置 - 请填入您的新API密钥
    TENCENT_CLOUD: {
        SECRET_ID: '',  // 请在页面中手动输入，或填入新的SecretId
        SECRET_KEY: '', // 请在页面中手动输入，或填入新的SecretKey
        BUCKET: 'audio-qr-1361719303',                 // 您的存储桶名称
        REGION: 'ap-chengdu',                          // 成都地域
    },
    
    // 应用配置
    APP: {
        BASE_URL: window.location.origin,
        PLAY_PAGE: '/audio-qr-system/play.html'  // GitHub Pages子路径
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

// GitHub Pages 特殊说明
console.log('🚀 GitHub Pages 部署版本 - audio-qr-system');
console.log('📝 请在页面中手动输入API密钥，或在此文件中配置');
console.log('🔒 建议使用页面输入方式，避免密钥暴露在代码中'); 