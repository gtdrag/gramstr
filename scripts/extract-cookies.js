// Instagram Cookie Extractor
// Run this script in your browser's developer console while logged into Instagram

(function() {
    console.log('🍪 Instagram Cookie Extractor');
    console.log('Make sure you are logged into Instagram in this tab!');
    
    // Get all cookies for Instagram
    const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
            name: name,
            value: value,
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: false
        };
    });
    
    // Filter for important Instagram cookies
    const importantCookies = cookies.filter(cookie => 
        ['sessionid', 'csrftoken', 'mid', 'ig_did', 'ds_user_id', 'ig_nrcb'].includes(cookie.name)
    );
    
    if (importantCookies.length === 0) {
        console.error('❌ No Instagram cookies found. Make sure you are logged in!');
        return;
    }
    
    const cookieData = JSON.stringify(importantCookies, null, 2);
    
    console.log('✅ Found Instagram session cookies:');
    console.log(cookieData);
    
    // Create downloadable file
    const blob = new Blob([cookieData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session_cookies.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 Cookies saved as "session_cookies.json"');
    console.log('📋 Copy the JSON above and save it as backend/session_cookies.json in your project');
    
    return importantCookies;
})();