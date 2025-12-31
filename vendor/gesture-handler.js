/**
 * 手势支持组件
 * 低优先级优化：手势支持 - 添加左滑/右滑手势，提升操作效率
 * 
 * 功能：
 * - 左滑：打开侧边栏
 * - 右滑：关闭侧边栏
 */

(function() {
    'use strict';

    /**
     * 手势处理器
     */
    class GestureHandler {
        constructor() {
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
            this.minSwipeDistance = 50; // 最小滑动距离（px）
            this.maxVerticalDistance = 100; // 最大垂直偏移（px），超过此值不视为滑动
            this.isEnabled = false;
            this.sidebar = null;
            this.mobileMenuBtn = null;
            
            this.init();
        }

        /**
         * 初始化手势处理器
         */
        init() {
            // 只在移动端启用
            if (window.innerWidth > 1024) {
                return;
            }

            // 等待 DOM 加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        /**
         * 设置手势监听
         */
        setup() {
            // 查找侧边栏和菜单按钮
            this.sidebar = document.getElementById('sidebar');
            this.mobileMenuBtn = document.getElementById('mobileMenuToggle');

            if (!this.sidebar) {
                // 如果侧边栏还未加载，等待一下
                setTimeout(() => {
                    this.sidebar = document.getElementById('sidebar');
                    if (this.sidebar) {
                        this.enable();
                    }
                }, 500);
                return;
            }

            this.enable();
        }

        /**
         * 启用手势支持
         */
        enable() {
            if (this.isEnabled) return;
            
            // 只在移动端启用
            if (window.innerWidth > 1024) {
                return;
            }

            this.isEnabled = true;
            
            // 监听触摸事件
            document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

            // 监听窗口大小变化，动态启用/禁用
            window.addEventListener('resize', this.debounce(() => {
                if (window.innerWidth > 1024 && this.isEnabled) {
                    this.disable();
                } else if (window.innerWidth <= 1024 && !this.isEnabled) {
                    this.enable();
                }
            }, 250));
        }

        /**
         * 禁用手势支持
         */
        disable() {
            if (!this.isEnabled) return;
            
            this.isEnabled = false;
            // 注意：由于使用了 passive: true，无法直接移除事件监听器
            // 但通过 isEnabled 标志可以快速返回，避免处理
        }

        /**
         * 处理触摸开始
         */
        handleTouchStart(e) {
            if (!this.isEnabled || !this.sidebar) return;
            
            // 如果触摸点在侧边栏内部，不处理
            if (this.sidebar.contains(e.target)) {
                return;
            }

            // 如果触摸点在按钮上，不处理（按钮有自己的点击事件）
            if (this.mobileMenuBtn && this.mobileMenuBtn.contains(e.target)) {
                return;
            }

            // 如果触摸点在可滚动元素内，不处理
            if (this.isScrollableElement(e.target)) {
                return;
            }

            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }

        /**
         * 处理触摸移动
         */
        handleTouchMove(e) {
            if (!this.isEnabled || !this.sidebar) return;
            
            // 如果触摸点在侧边栏内部，不处理
            if (this.sidebar.contains(e.target)) {
                return;
            }

            const touch = e.touches[0];
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;
        }

        /**
         * 处理触摸结束
         */
        handleTouchEnd(e) {
            if (!this.isEnabled || !this.sidebar) return;
            
            // 如果触摸点在侧边栏内部，不处理
            if (this.sidebar.contains(e.target)) {
                return;
            }

            // 如果触摸点在按钮上，不处理
            if (this.mobileMenuBtn && this.mobileMenuBtn.contains(e.target)) {
                return;
            }

            // 如果触摸点在可滚动元素内，不处理
            if (this.isScrollableElement(e.target)) {
                return;
            }

            const deltaX = this.touchEndX - this.touchStartX;
            const deltaY = Math.abs(this.touchEndY - this.touchStartY);

            // 检查是否为有效的水平滑动
            if (Math.abs(deltaX) < this.minSwipeDistance) {
                return; // 滑动距离不足
            }

            if (deltaY > this.maxVerticalDistance) {
                return; // 垂直偏移过大，可能是垂直滚动
            }

            // 判断滑动方向
            if (deltaX < 0) {
                // 左滑：打开侧边栏
                this.openSidebar();
            } else if (deltaX > 0) {
                // 右滑：关闭侧边栏
                this.closeSidebar();
            }
        }

        /**
         * 打开侧边栏
         */
        openSidebar() {
            if (!this.sidebar) return;
            
            // 如果侧边栏已经打开，不处理
            if (this.sidebar.classList.contains('show')) {
                return;
            }

            this.sidebar.classList.add('show');
            
            // 更新按钮图标
            if (this.mobileMenuBtn) {
                this.mobileMenuBtn.innerHTML = '✕';
                this.mobileMenuBtn.setAttribute('aria-label', '关闭导航菜单');
            }

            // 触发自定义事件
            this.sidebar.dispatchEvent(new CustomEvent('sidebarOpened', { bubbles: true }));
        }

        /**
         * 关闭侧边栏
         */
        closeSidebar() {
            if (!this.sidebar) return;
            
            // 如果侧边栏已经关闭，不处理
            if (!this.sidebar.classList.contains('show')) {
                return;
            }

            this.sidebar.classList.remove('show');
            
            // 更新按钮图标
            if (this.mobileMenuBtn) {
                this.mobileMenuBtn.innerHTML = '☰';
                this.mobileMenuBtn.setAttribute('aria-label', '打开导航菜单');
            }

            // 触发自定义事件
            this.sidebar.dispatchEvent(new CustomEvent('sidebarClosed', { bubbles: true }));
        }

        /**
         * 检查元素是否为可滚动元素
         */
        isScrollableElement(element) {
            if (!element) return false;
            
            // 检查元素及其父元素是否有 overflow 属性
            let current = element;
            while (current && current !== document.body) {
                const style = window.getComputedStyle(current);
                const overflow = style.overflow + style.overflowX + style.overflowY;
                
                if (overflow.includes('scroll') || overflow.includes('auto')) {
                    // 检查是否真的可以滚动
                    if (current.scrollHeight > current.clientHeight || 
                        current.scrollWidth > current.clientWidth) {
                        return true;
                    }
                }
                
                current = current.parentElement;
            }
            
            return false;
        }

        /**
         * 防抖函数
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    // 创建全局实例
    if (typeof window !== 'undefined') {
        window.gestureHandler = window.gestureHandler || new GestureHandler();
    }
})();

