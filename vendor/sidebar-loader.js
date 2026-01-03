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
        market: {
            icon: '📊',
            label: 'Market 系列工具',
            submenuId: 'submenuMarket',
            items: [
                { href: 'Market-SCFI-Trends.html?from=market', icon: '📈', label: 'SCFI 历史趋势' },
                { href: 'Market-Sailing-Schedule.html?from=market', icon: '📅', label: '专业船期表' },
                { href: 'Market-Geo-Trades-Service.html?from=market', icon: '🌐', label: '地理贸易航线' },
                { href: 'Market-Information.html?from=market', icon: '📚', label: '企业宣传资料' }
            ]
        },
        monitor: {
            icon: '📡',
            label: 'Monitor 系列工具',
            submenuId: 'submenuMonitor',
            items: [
                { href: 'Monitor-Rate-Trends.html?from=monitor', icon: '💹', label: '运价趋势面板' },
                { href: 'Monitor-Daily-Booking.html?from=monitor', icon: '📋', label: '每日订舱监控' },
                { href: 'Monitor-Booking-Summary.html?from=monitor', icon: '📊', label: '订舱汇总分析' }
            ]
        },
        admin: {
            icon: '⚙️',
            label: 'Admin 系列工具',
            submenuId: 'submenuAdmin',
            items: [
                { href: 'Admin-Access-Log.html?from=admin', icon: '👥', label: '访客统计排名' },
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
        const { currentPage = '', currentSection = '', isDashboard = false, hasAdminPermission: providedPermission = false, permissions: providedPermissions = null } = options;
        
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

        // 获取权限信息
        let permissions = providedPermissions;
        if (!permissions) {
            // 如果没有提供权限信息，使用默认值或检查
            permissions = {
                tools001: true,
                tools365: true,
                market: true,
                monitor: true,
                admin: providedPermission
            };
            
            // 如果权限检查函数可用，尝试同步检查（但可能不准确，因为白名单可能未加载）
            if (typeof window.hasPermission === 'function') {
                permissions.admin = window.hasPermission('admin');
            }
        }
        
        // 生成每个主菜单项
        Object.keys(NAV_CONFIG).forEach((sectionKey) => {
            // 检查该系列的权限（但始终生成主菜单项，以便用户能看到系列分类）
            const hasPermission = permissions[sectionKey] !== false; // 默认true，除非明确设置为false
            
            const config = NAV_CONFIG[sectionKey];
            const isActive = currentSection === sectionKey;
            // admin菜单需要权限检查，其他菜单在dashboard中默认展开
            const shouldExpand = sectionKey === 'admin' 
                ? (isActive || (isDashboard && permissions.admin))
                : (isActive || (isDashboard && ['tools365', 'market', 'monitor'].includes(sectionKey)));
            const isExpanded = shouldExpand && hasPermission; // 只有有权限时才展开
            // 修正主菜单链接路径
            let mainHref = isDashboard ? '#' : `dashboard.html?tab=${sectionKey}`;
            const isInSubDir = currentPage.includes('/') && !currentPage.startsWith('/');
            if (isInSubDir && !isDashboard) {
                mainHref = '../' + mainHref;
            }
            
            // 始终生成主菜单项，但根据权限决定是否可点击和展开
            html += `
                        <a href="${mainHref}" class="nav-item ${isExpanded ? 'expanded' : ''} ${isActive ? 'active' : ''} ${!hasPermission ? 'no-permission' : ''}" 
                           data-section="${sectionKey}" 
                           data-label="${config.label}" 
                           role="button" 
                           aria-expanded="${isExpanded}" 
                           aria-controls="${config.submenuId}" 
                           tabindex="0" 
                           title="${config.label}${!hasPermission ? ' (无权限)' : ''}"
                           ${!hasPermission ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            <span class="nav-item-icon" aria-hidden="true">${config.icon}</span>
                            <span>${config.label}</span>
                            <span class="nav-toggle-icon" aria-hidden="true">▶</span>
                        </a>
                        <div class="nav-submenu ${isExpanded ? 'expanded' : ''}" id="${config.submenuId}" ${sectionKey === 'tools365' ? 'role="menu"' : ''} ${!hasPermission ? 'style="display: none;"' : ''}>
            `;

            // 只有有权限时才生成子菜单项
            if (hasPermission) {
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
            }

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
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('导航栏元素未找到');
            }
            return;
        }

        // 检测是否为移动端
        const isMobile = window.innerWidth <= 768;
        
        // 移动端：默认隐藏导航栏，添加移动端菜单按钮
        if (isMobile) {
            sidebar.classList.remove('show'); // 确保默认不显示
            
            // 创建移动端菜单按钮（如果不存在）
            let mobileMenuBtn = document.getElementById('mobileMenuToggle');
            if (!mobileMenuBtn) {
                mobileMenuBtn = document.createElement('button');
                mobileMenuBtn.id = 'mobileMenuToggle';
                mobileMenuBtn.className = 'mobile-menu-toggle';
                mobileMenuBtn.innerHTML = '☰';
                mobileMenuBtn.setAttribute('aria-label', '打开导航菜单');
                document.body.appendChild(mobileMenuBtn);
                
                // 点击按钮显示/隐藏导航栏
                mobileMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sidebar.classList.toggle('show');
                    // 更新按钮图标
                    mobileMenuBtn.innerHTML = sidebar.classList.contains('show') ? '✕' : '☰';
                });
                
                // 点击导航栏外部区域关闭导航栏
                document.addEventListener('click', (e) => {
                    if (sidebar.classList.contains('show') && 
                        !sidebar.contains(e.target) && 
                        !mobileMenuBtn.contains(e.target)) {
                        sidebar.classList.remove('show');
                        mobileMenuBtn.innerHTML = '☰';
                    }
                });
            }
        }

        // 侧边栏折叠/展开（桌面端）
        // 确保默认展开（不折叠），让用户能看到系列标题
        if (!isMobile) {
            sidebar.classList.remove('collapsed');
        }
        
        sidebarToggle.addEventListener('click', () => {
            if (!isMobile) {
                sidebar.classList.toggle('collapsed');
                // 保存折叠状态到localStorage
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            }
        });
        
        // 恢复之前的折叠状态（但默认展开）
        if (!isMobile) {
            const savedCollapsed = localStorage.getItem('sidebarCollapsed');
            if (savedCollapsed === 'true') {
                sidebar.classList.add('collapsed');
            }
        }
        
        // 监听窗口大小变化
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const nowIsMobile = window.innerWidth <= 768;
                if (nowIsMobile !== isMobile) {
                    // 重新初始化（可以刷新页面或重新加载导航栏）
                    location.reload();
                }
            }, 250);
        });

        // 导航菜单展开/折叠功能 - 每个菜单独立控制
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            const handleToggle = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = item.dataset.section;
                const submenuId = NAV_CONFIG[section]?.submenuId || `submenu${section === 'tools001' ? '001' : section === 'tools365' ? '365' : section === 'market' ? 'Market' : section === 'monitor' ? 'Monitor' : 'Admin'}`;
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
            if (typeof window.debugError === 'function') {
                window.debugError('加载用户信息失败:', error);
            }
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
            if (typeof window.debugError === 'function') {
                window.debugError('导航栏容器未找到:', container);
            }
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
            else if (fromParam === 'market') currentSection = 'market';
            else if (fromParam === 'monitor') currentSection = 'monitor';
            else if (fromParam === 'admin') currentSection = 'admin';
            else {
                // 根据文件名判断
                if (currentPage.includes('001-')) currentSection = 'tools001';
                else if (currentPage.includes('365-')) currentSection = 'tools365';
                else if (currentPage.includes('Market-')) currentSection = 'market';
                else if (currentPage.includes('Monitor-')) currentSection = 'monitor';
                else if (currentPage.includes('Admin-')) currentSection = 'admin';
                else if (currentPage.includes('tests/')) currentSection = 'admin';
            }
        }

        // 判断是否为dashboard页面（优先使用传入的options）
        const isDashboard = options.isDashboard !== undefined ? options.isDashboard : (currentPage === 'dashboard.html' || currentPage === 'index.html' || !currentPage);

        // 检查用户是否已登录（通过检查localStorage中的认证数据）
        let hasAuthData = false;
        try {
            const authDataStr = localStorage.getItem('shipping_tools_auth');
            hasAuthData = authDataStr !== null && authDataStr !== undefined;
        } catch (e) {
            // localStorage不可用，假设用户未登录
            hasAuthData = false;
        }
        
        // 如果用户未登录，直接跳转到登录页面
        if (!hasAuthData) {
            if (typeof window.debugLog === 'function') {
                window.debugLog('[Sidebar] 用户未登录，跳转到登录页面');
            }
            // 跳转到index.html
            if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html';
            }
            return;
        }
        
        // 用户已登录，先确保用户已通过API验证（checkPageAccess完成）
        // 等待白名单加载完成，并确保用户信息已从API验证中获取
        // 默认值：权限检查失败时，只允许访问001系列、365系列、market系列
        let permissions = {
            tools001: true,
            tools365: true,
            market: true,
            monitor: false,
            admin: false
        };
        
        // 先等待白名单加载完成
        if (typeof window.waitForWhitelist === 'function') {
            await window.waitForWhitelist();
        }
        
        // 检查用户是否在白名单中（如果不在，说明API验证可能还未完成）
        // 尝试从localStorage获取认证数据，并确保用户信息已添加到白名单
        let authData = null;
        try {
            const authDataStr = localStorage.getItem('shipping_tools_auth');
            if (authDataStr) {
                authData = JSON.parse(authDataStr);
            }
        } catch (e) {
            if (typeof window.debugWarn === 'function') {
                window.debugWarn('[Sidebar] 无法解析认证数据:', e);
            }
        }
        
        // 如果用户不在白名单中，尝试通过API验证（确保API返回的groups被添加到白名单）
        if (authData && typeof window.verifyUserInWhitelist === 'function') {
            // 检查用户是否已在白名单中
            let userInWhitelist = false;
            if (typeof window.getUserFromWhitelist === 'function') {
                userInWhitelist = !!window.getUserFromWhitelist(authData);
            }
            
            // 如果用户不在白名单中，等待API验证完成（这会调用verifyUserInWhitelist，将groups添加到白名单）
            if (!userInWhitelist) {
                if (typeof window.debugLog === 'function') {
                    window.debugLog('[Sidebar] 用户不在白名单缓存中，等待API验证完成...');
                }
                // 等待一小段时间，让checkPageAccess完成API验证
                await new Promise(resolve => setTimeout(resolve, 500));
                // 再次检查
                if (typeof window.getUserFromWhitelist === 'function') {
                    userInWhitelist = !!window.getUserFromWhitelist(authData);
                }
                // 如果仍然不在，主动调用verifyUserInWhitelist（但只在必要时）
                if (!userInWhitelist && typeof window.verifyUserInWhitelist === 'function') {
                    if (typeof window.debugLog === 'function') {
                        window.debugLog('[Sidebar] 主动调用API验证用户...');
                    }
                    try {
                        await window.verifyUserInWhitelist(
                            authData.name || '',
                            authData.phone || authData.password || '',
                            authData.email || ''
                        );
                    } catch (error) {
                        if (typeof window.debugWarn === 'function') {
                            window.debugWarn('[Sidebar] API验证失败:', error);
                        }
                    }
                }
            }
        }
        
        // 再次等待白名单更新（确保API返回的groups已添加到白名单）
        if (typeof window.waitForWhitelist === 'function') {
            await window.waitForWhitelist();
        }
        
        if (typeof window.hasPermission === 'function') {
            // 检查所有系列的权限
            // 如果权限检查失败（白名单未加载），使用默认值（允许访问）
            try {
                const checkedPermissions = {
                    tools001: await window.hasPermission('tools001', true),
                    tools365: await window.hasPermission('tools365', true),
                    market: await window.hasPermission('market', true),
                    monitor: await window.hasPermission('monitor', true),
                    admin: await window.hasPermission('admin', true)
                };
                
                // 调试信息：输出权限检查结果
                if (typeof window.debugLog === 'function') {
                    window.debugLog('[Sidebar] 权限检查结果:', checkedPermissions);
                }
                
                // 只有当权限检查成功时才更新permissions
                // 如果所有权限都是false，可能是权限检查失败，使用默认值（只允许001、365、market）
                const allFalse = Object.values(checkedPermissions).every(v => v === false);
                if (!allFalse) {
                    permissions = checkedPermissions;
                    if (typeof window.debugLog === 'function') {
                        window.debugLog('[Sidebar] 使用检查后的权限:', permissions);
                    }
                } else {
                    // 如果所有权限都是false，可能是权限检查失败，使用默认值（只允许001、365、market）
                    if (typeof window.debugWarn === 'function') {
                        window.debugWarn('[Sidebar] 所有权限检查返回false，可能是权限检查失败，使用默认权限（只允许001、365、market系列）');
                    }
                    // 保持默认的permissions（只允许001、365、market）
                }
            } catch (error) {
                // 如果权限检查出错，使用默认值（只允许001、365、market）
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('[Sidebar] 权限检查失败，使用默认权限（只允许001、365、market系列）:', error);
                }
            }
        } else {
            if (typeof window.debugLog === 'function') {
                window.debugLog('[Sidebar] hasPermission函数不可用，使用默认权限（只允许001、365、market系列）');
            }
        }
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('[Sidebar] 最终使用的权限:', permissions);
        }

        // 生成并插入HTML
        const sidebarHTML = generateSidebarHTML({
            currentPage,
            currentSection,
            isDashboard,
            hasAdminPermission: permissions.admin,
            permissions: permissions,
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
        
        // 根据权限动态隐藏/显示导航项（在导航栏加载后）
        // 只有在权限检查成功且明确返回false时才隐藏导航项
        // 如果权限检查失败（白名单未加载），默认显示所有导航项
        if (typeof window.hasPermission === 'function') {
            // 检查是否所有权限都是false（可能是权限检查失败）
            const allFalse = Object.values(permissions).every(v => v === false);
            
            // 如果所有权限都是false，可能是权限检查失败，不隐藏任何导航项
            if (allFalse) {
                if (typeof window.debugWarn === 'function') {
                    window.debugWarn('[Sidebar] 所有权限检查返回false，可能是权限检查失败，显示所有导航项');
                }
                // 确保所有导航项都显示
                Object.keys(permissions).forEach(sectionKey => {
                    const navItem = document.querySelector(`.nav-item[data-section="${sectionKey}"]`);
                    if (navItem) {
                        navItem.style.display = '';
                        const submenu = document.getElementById(NAV_CONFIG[sectionKey]?.submenuId);
                        if (submenu) {
                            submenu.style.display = '';
                        }
                    }
                });
            } else {
                // 只有部分权限为false时，才隐藏对应的导航项
                Object.keys(permissions).forEach(sectionKey => {
                    const navItem = document.querySelector(`.nav-item[data-section="${sectionKey}"]`);
                    if (navItem) {
                        if (!permissions[sectionKey]) {
                            // 隐藏没有权限的导航项及其子菜单
                            navItem.style.display = 'none';
                            const submenu = document.getElementById(NAV_CONFIG[sectionKey]?.submenuId);
                            if (submenu) {
                                submenu.style.display = 'none';
                            }
                        } else {
                            // 确保有权限的导航项显示
                            navItem.style.display = '';
                            const submenu = document.getElementById(NAV_CONFIG[sectionKey]?.submenuId);
                            if (submenu) {
                                submenu.style.display = '';
                            }
                        }
                    }
                });
            }
        }

        // 监听存储变化
        window.addEventListener('storage', (e) => {
            if (e.key === 'shipping_tools_auth') {
                controlRestrictedTools();
                loadUserInfo();
                // 重新检查权限并更新导航栏
                if (typeof window.hasPermission === 'function' && typeof window.waitForWhitelist === 'function') {
                    window.waitForWhitelist().then(async () => {
                        const newPermissions = {
                            tools001: await window.hasPermission('tools001', true),
                            tools365: await window.hasPermission('tools365', true),
                            market: await window.hasPermission('market', true),
                            monitor: await window.hasPermission('monitor', true),
                            admin: await window.hasPermission('admin', true)
                        };
                        Object.keys(newPermissions).forEach(sectionKey => {
                            const navItem = document.querySelector(`.nav-item[data-section="${sectionKey}"]`);
                            if (navItem) {
                                if (!newPermissions[sectionKey]) {
                                    navItem.style.display = 'none';
                                    const submenu = document.getElementById(NAV_CONFIG[sectionKey]?.submenuId);
                                    if (submenu) {
                                        submenu.style.display = 'none';
                                    }
                                } else {
                                    navItem.style.display = '';
                                    const submenu = document.getElementById(NAV_CONFIG[sectionKey]?.submenuId);
                                    if (submenu) {
                                        submenu.style.display = '';
                                    }
                                }
                            }
                        });
                    });
                }
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
