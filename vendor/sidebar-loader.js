/**
 * 左侧导航栏公共组件
 * 用于所有工具页面统一加载导航栏
 */

(function() {
    'use strict';

    // 导航栏配置数据
    const NAV_CONFIG = {
        tools001: {
            icon: '📦',
            label: '001 系列工具',
            submenuId: 'submenu001',
            items: [
                { href: '001-01-manual-download.html?from=tools001', icon: '⬇️', label: '船期网页下载工具' },
                { href: '001-02-schedule-parser.html?from=tools001', icon: '🔍', label: '船期解析工具' },
                { href: '001-03-port-standardizer.html?from=tools001', icon: '🔧', label: '港口标准化工具' },
                { href: '001-04-market-analysis.html?from=tools001', icon: '📊', label: '市场分析工具' }
            ]
        },
        tools365: {
            icon: '🚢',
            label: '365 系列工具',
            submenuId: 'submenu365',
            items: [
                { href: '365-01-manual-download.html?from=tools365', icon: '⬇️', label: '船期网页下载工具' },
                { href: '365-02-schedule-full-parser.html?from=tools365', icon: '🔍', label: '船期完整解析工具' },
                { href: '365-02-rotation-parser.html?from=tools365', icon: '🗺️', label: '航线路径解析工具' },
                { href: '365-02-market-rate-parser.html?from=tools365', icon: '💰', label: '港口行情解析工具' },
                { href: '365-03-port-standardizer.html?from=tools365', icon: '🔧', label: '港口标准化工具' },
                { href: '365-03-market-port-standardizer.html?from=tools365', icon: '🏢', label: '行情标准化工具' },
                { href: '365-04-market-watch.html?from=tools365', icon: '📊', label: '市场观察工具' }
            ]
        },
        monitor: {
            icon: '📡',
            label: 'Monitor 系列工具',
            submenuId: 'submenuMonitor',
            items: [
                { href: 'Monitor-SCFI-Trends.html?from=monitor', icon: '📈', label: 'SCFI 历史趋势' },
                { href: 'Monitor-Rate-Trends.html?from=monitor', icon: '💹', label: '运价趋势面板' },
                { href: 'Monitor-Sailing-Schedule.html?from=monitor', icon: '📅', label: '专业船期表' },
                { href: 'Monitor-Geo-Trades-Service.html?from=monitor', icon: '🌐', label: '地理贸易航线' }
            ]
        },
        admin: {
            icon: '⚙️',
            label: 'Admin 系列工具',
            submenuId: 'submenuAdmin',
            items: [
                { href: 'Admin-Access-Log.html?from=admin', icon: '👥', label: '访客统计排名' },
                { href: 'Admin-Workouts.html?from=admin', icon: '💪', label: '健身记录面板' },
                { href: 'tests/index.html?from=admin', icon: '🧪', label: '单元测试工具' }
            ]
        }
    };

    /**
     * 生成导航栏HTML
     * @param {Object} options - 配置选项
     * @param {string} options.currentPage - 当前页面路径，用于设置active状态
     * @param {string} options.currentSection - 当前激活的section（tools001/tools365/monitor）
     * @param {boolean} options.isDashboard - 是否为dashboard页面（决定主菜单链接）
     * @param {boolean} options.hasAdminPermission - 是否有admin权限（如果已检查）
     * @returns {string} 导航栏HTML字符串
     */
    function generateSidebarHTML(options = {}) {
        const { currentPage = '', currentSection = '', isDashboard = false, hasAdminPermission: providedPermission = false } = options;
        
        let html = `
        <aside class="dashboard-sidebar" id="sidebar">
            <div class="sidebar-header">
                <div>
                    <h2>Shipping Tools</h2>
                </div>
                <button class="sidebar-toggle" id="sidebarToggle" title="折叠/展开导航">☰</button>
            </div>
            <div class="sidebar-body">
                <nav class="sidebar-nav">
                    <div class="nav-section">
                        <div class="nav-section-title">工具导航</div>
        `;

        // 检查用户是否有admin权限（如果未提供，则同步检查）
        let hasAdminPermission = providedPermission;
        if (!providedPermission && typeof window.hasPermission === 'function') {
            hasAdminPermission = window.hasPermission('admin');
        }
        
        // 生成每个主菜单项
        Object.keys(NAV_CONFIG).forEach((sectionKey) => {
            // 如果是admin菜单，检查权限
            if (sectionKey === 'admin' && !hasAdminPermission) {
                return; // 跳过admin菜单
            }
            
            const config = NAV_CONFIG[sectionKey];
            const isActive = currentSection === sectionKey;
            // admin菜单需要权限检查，其他菜单在dashboard中默认展开
            const shouldExpand = sectionKey === 'admin' 
                ? (isActive || (isDashboard && hasAdminPermission))
                : (isActive || (isDashboard && ['tools365', 'monitor'].includes(sectionKey)));
            const isExpanded = shouldExpand;
            // 修正主菜单链接路径
            let mainHref = isDashboard ? '#' : `dashboard.html?tab=${sectionKey}`;
            const isInSubDir = currentPage.includes('/') && !currentPage.startsWith('/');
            if (isInSubDir && !isDashboard) {
                mainHref = '../' + mainHref;
            }
            
            html += `
                        <a href="${mainHref}" class="nav-item ${isExpanded ? 'expanded' : ''} ${isActive ? 'active' : ''}" 
                           data-section="${sectionKey}" 
                           data-label="${config.label}" 
                           role="button" 
                           aria-expanded="${isExpanded}" 
                           aria-controls="${config.submenuId}" 
                           tabindex="0" 
                           title="${config.label}">
                            <span class="nav-item-icon" aria-hidden="true">${config.icon}</span>
                            <span>${config.label}</span>
                            <span class="nav-toggle-icon" aria-hidden="true">▶</span>
                        </a>
                        <div class="nav-submenu ${isExpanded ? 'expanded' : ''}" id="${config.submenuId}" ${sectionKey === 'tools365' ? 'role="menu"' : ''}>
            `;

            // 生成子菜单项
            config.items.forEach((item) => {
                // 修正路径：如果当前页面在子目录中（如 tests/），需要调整相对路径
                let href = item.href;
                const isInSubDir = currentPage.includes('/') && !currentPage.startsWith('/');
                if (isInSubDir) {
                    // 当前页面在子目录中（如 tests/index.html 或 tests/readme.html）
                    const currentDir = currentPage.substring(0, currentPage.lastIndexOf('/') + 1); // 如 "tests/"
                    const hrefPath = href.split('?')[0]; // 获取路径部分，去掉查询参数
                    
                    // 如果链接指向根目录的文件（不包含 /），需要加上 ../
                    if (!hrefPath.includes('/') && !href.startsWith('../') && !href.startsWith('/')) {
                        href = '../' + href;
                    }
                    // 如果链接指向子目录的文件（如 tests/index.html）
                    else if (hrefPath.includes('/') && !href.startsWith('../') && !href.startsWith('/')) {
                        // 检查链接是否指向当前目录
                        const linkDir = hrefPath.substring(0, hrefPath.lastIndexOf('/') + 1); // 如 "tests/"
                        if (linkDir === currentDir) {
                            // 链接指向当前目录，只需要文件名部分
                            const fileName = hrefPath.substring(hrefPath.lastIndexOf('/') + 1);
                            const queryString = href.includes('?') ? href.substring(href.indexOf('?')) : '';
                            href = fileName + queryString;
                        }
                        // 如果链接指向其他目录，保持原样（这种情况应该很少）
                    }
                }
                
                const isItemActive = currentPage && currentPage.includes(item.href.split('?')[0]);
                const activeStyle = isItemActive ? 'style="background: rgba(255,138,0,0.14); border-left: 3px solid #FF8A00; color: var(--color-text-primary);"' : '';
                const restrictedClass = item.restricted ? 'restricted-tool' : '';
                const restrictedAttr = item.restricted ? `data-restricted-tool="${item.restricted}"` : '';
                const roleAttr = sectionKey === 'tools365' ? 'role="menuitem"' : '';
                const ariaHidden = sectionKey === 'tools365' ? 'aria-hidden="true"' : '';
                
                html += `
                            <a href="${href}" 
                               class="nav-submenu-item ${restrictedClass} ${isItemActive ? 'active' : ''}" 
                               ${restrictedAttr}
                               ${roleAttr}
                               data-label="${item.label}"
                               ${activeStyle}>
                                <span class="nav-submenu-icon" ${ariaHidden}>${item.icon}</span>${item.label}
                            </a>
                `;
            });

            html += `
                        </div>
            `;
        });

        // 用户信息区域
        html += `
                    </div>
                </nav>
                <div class="sidebar-footer user-meta">
                    <div class="user-brief">
                        <div class="user-brief-item" id="sidebarUserName" data-label="用户：未登录">
                            <span class="user-brief-icon">👤</span>
                            <span class="user-brief-text">用户：未登录</span>
                        </div>
                        <div class="user-brief-item" id="sidebarUserLevel" data-label="等级：--">
                            <span class="user-brief-icon">⭐</span>
                            <span class="user-brief-text">等级：--</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        `;

        return html;
    }

    /**
     * 初始化导航栏功能
     */
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        if (!sidebar || !sidebarToggle) {
            console.warn('导航栏元素未找到');
            return;
        }

        // 侧边栏折叠/展开
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        // 导航菜单展开/折叠功能 - 每个菜单独立控制
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            const handleToggle = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = item.dataset.section;
                const submenuId = NAV_CONFIG[section]?.submenuId || `submenu${section === 'tools001' ? '001' : section === 'tools365' ? '365' : 'Monitor'}`;
                const submenu = document.getElementById(submenuId);
                
                if (submenu) {
                    const isExpanded = submenu.classList.contains('expanded');
                    if (isExpanded) {
                        submenu.classList.remove('expanded');
                        item.classList.remove('expanded');
                        item.setAttribute('aria-expanded', 'false');
                    } else {
                        submenu.classList.add('expanded');
                        item.classList.add('expanded');
                        item.setAttribute('aria-expanded', 'true');
                    }
                }
            };

            item.addEventListener('click', handleToggle);
            
            // 键盘支持
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(e);
                }
            });
        });
    }

    /**
     * 加载用户信息
     */
    async function loadUserInfo() {
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserLevel = document.getElementById('sidebarUserLevel');
        const AUTH_STORAGE_KEY = 'shipping_tools_auth';
        
        try {
            const authDataStr = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!authDataStr) {
                if (sidebarUserName) {
                    sidebarUserName.querySelector('.user-brief-text').textContent = '用户：未登录';
                    sidebarUserName.setAttribute('data-label', '用户：未登录');
                }
                if (sidebarUserLevel) {
                    sidebarUserLevel.querySelector('.user-brief-text').textContent = '等级：--';
                    sidebarUserLevel.setAttribute('data-label', '等级：--');
                }
                return;
            }
            
            const authData = JSON.parse(authDataStr);
            const name = authData.name || '未登录';
            
            // 从白名单中获取用户信息（包括level）
            // 注意：白名单应该已经由 auth-gist.js 的 autoInitWithAuth 加载
            let level = 'user';
            if (typeof window.getUserFromWhitelist === 'function') {
                const user = window.getUserFromWhitelist(authData);
                if (user && user.level) {
                    level = user.level;
                } else if (authData.level) {
                    // 降级：如果白名单中没有，使用authData中的level
                    level = authData.level;
                }
            } else if (authData.level) {
                // 降级：如果函数不存在，使用authData中的level
                level = authData.level;
            }
            
            if (sidebarUserName) {
                sidebarUserName.querySelector('.user-brief-text').textContent = `用户：${name}`;
                sidebarUserName.setAttribute('data-label', `用户：${name}`);
            }
            if (sidebarUserLevel) {
                sidebarUserLevel.querySelector('.user-brief-text').textContent = `等级：${level}`;
                sidebarUserLevel.setAttribute('data-label', `等级：${level}`);
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
            if (sidebarUserName) {
                sidebarUserName.querySelector('.user-brief-text').textContent = '用户：未登录';
                sidebarUserName.setAttribute('data-label', '用户：未登录');
            }
            if (sidebarUserLevel) {
                sidebarUserLevel.querySelector('.user-brief-text').textContent = '等级：--';
                sidebarUserLevel.setAttribute('data-label', '等级：--');
            }
        }
    }

    /**
     * 控制受限工具显示
     */
    function controlRestrictedTools() {
        // 检查是否为SmartPu用户
        function isSmartPuUser() {
            try {
                const authDataStr = localStorage.getItem('shipping_tools_auth');
                if (!authDataStr) return false;
                const authData = JSON.parse(authDataStr);
                return authData.level === 'SmartPu' || authData.level === 'smartpu';
            } catch {
                return false;
            }
        }

        const isSmartPu = isSmartPuUser();
        const restrictedTools = document.querySelectorAll('.restricted-tool');
        
        restrictedTools.forEach(tool => {
            if (isSmartPu) {
                tool.style.display = '';
                tool.style.visibility = '';
            } else {
                tool.style.display = 'none';
                tool.style.visibility = 'hidden';
            }
        });
    }

    /**
     * 加载导航栏到指定容器
     * @param {string|HTMLElement} container - 容器选择器或元素
     * @param {Object} options - 配置选项
     */
    async function loadSidebar(container, options = {}) {
        const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        
        if (!containerEl) {
            console.error('导航栏容器未找到:', container);
            return;
        }

        // 检测当前页面（优先使用传入的options）
        const currentPage = options.currentPage || window.location.pathname.split('/').pop() || window.location.href.split('/').pop() || '';
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');

        // 根据from参数或当前页面确定section（优先使用传入的options）
        let currentSection = options.currentSection || '';
        if (!currentSection) {
            if (fromParam === 'tools001') currentSection = 'tools001';
            else if (fromParam === 'tools365') currentSection = 'tools365';
            else if (fromParam === 'monitor') currentSection = 'monitor';
            else if (fromParam === 'admin') currentSection = 'admin';
            else {
                // 根据文件名判断
                if (currentPage.includes('001-')) currentSection = 'tools001';
                else if (currentPage.includes('365-')) currentSection = 'tools365';
                else if (currentPage.includes('Monitor-')) currentSection = 'monitor';
                else if (currentPage.includes('Admin-')) currentSection = 'admin';
                else if (currentPage.includes('tests/')) currentSection = 'admin';
            }
        }

        // 判断是否为dashboard页面（优先使用传入的options）
        const isDashboard = options.isDashboard !== undefined ? options.isDashboard : (currentPage === 'dashboard.html' || currentPage === 'index.html' || !currentPage);

        // 等待白名单加载完成后再检查权限
        let hasAdminPermission = false;
        if (typeof window.waitForWhitelist === 'function') {
            await window.waitForWhitelist();
        }
        if (typeof window.hasPermission === 'function') {
            hasAdminPermission = await window.hasPermission('admin', true);
        }

        // 生成并插入HTML
        const sidebarHTML = generateSidebarHTML({
            currentPage,
            currentSection,
            isDashboard,
            hasAdminPermission,
            ...options
        });

        // 在容器之前插入导航栏（导航栏应该在dashboard-container内部，在占位容器之前）
        containerEl.insertAdjacentHTML('beforebegin', sidebarHTML);
        
        // 移除占位容器
        containerEl.remove();

        // 初始化功能
        initSidebar();
        loadUserInfo();
        controlRestrictedTools();

        // 监听存储变化
        window.addEventListener('storage', (e) => {
            if (e.key === 'shipping_tools_auth') {
                controlRestrictedTools();
                loadUserInfo();
            }
        });

        // 定期检查权限
        setInterval(() => {
            controlRestrictedTools();
            loadUserInfo();
        }, 1000);
    }

    // 导出到全局
    window.SidebarLoader = {
        load: loadSidebar,
        loadUserInfo: loadUserInfo,
        controlRestrictedTools: controlRestrictedTools,
        NAV_CONFIG: NAV_CONFIG
    };

})();
