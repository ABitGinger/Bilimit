// ==UserScript==
// @name         在B站看点有用的(独立计时)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  弹窗询问Bilibili内容是否有用，没用则倒计时后关闭标签页
// @author       壹位姜
// @match        https://www.bilibili.com/*
// @grant        none
// @license      GPL-3.0
// ==/UserScript==

// GPL 3.0 许可证声明
/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Author's website: abitginger.top
 */

(function() {
    'use strict';

    const total = 300; //总限额时长（秒）
    const alarm = 60; //告警时长（秒）<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<⚠️这里两个根据需要修改！


    // 如果当前URL中包含"BV"，则继续执行脚本，否则终止执行
    if (!window.location.href.includes('BV')) {
        return; // 如果没有"BV"字样，直接退出
    }

    // 禁止网页的互动和滚动，包括键盘操作
    function disableInteractions() {
        // 禁止滚动
        document.documentElement.style.overflow = 'hidden'; // 禁止html元素滚动
        document.body.style.overflow = 'hidden'; // 禁止body元素滚动

        // 禁止触摸滚动
        document.documentElement.style.touchAction = 'none'; // 禁止触摸操作
        document.body.style.touchAction = 'none'; // 禁止触摸操作

        // 禁用页面交互
        document.body.style.pointerEvents = 'none'; // 禁止所有交互

        // 禁止所有输入控件的交互
        const inputs = document.querySelectorAll('input, textarea, select, button, a');
        inputs.forEach((element) => {
            element.disabled = true; // 禁用所有输入控件
        });

        // 阻止所有键盘事件
        window.addEventListener('keydown', preventKeyEvent, true);
        window.addEventListener('keypress', preventKeyEvent, true);
        window.addEventListener('keyup', preventKeyEvent, true);

        // 阻止滚动事件
        window.addEventListener('wheel', preventScroll, { passive: false });
        window.addEventListener('touchmove', preventScroll, { passive: false });
    }

    // 恢复网页的互动和滚动
    function enableInteractions() {
        document.documentElement.style.overflow = 'auto'; // 恢复html元素滚动
        document.body.style.overflow = 'auto'; // 恢复body元素滚动

        // 恢复触摸滚动
        document.documentElement.style.touchAction = 'auto'; // 恢复触摸操作
        document.body.style.touchAction = 'auto'; // 恢复触摸操作

        // 恢复页面交互
        document.body.style.pointerEvents = 'auto'; // 恢复交互

        // 恢复所有输入控件的交互
        const inputs = document.querySelectorAll('input, textarea, select, button, a');
        inputs.forEach((element) => {
            element.disabled = false; // 启用所有输入控件
        });

        // 移除所有键盘事件监听
        window.removeEventListener('keydown', preventKeyEvent, true);
        window.removeEventListener('keypress', preventKeyEvent, true);
        window.removeEventListener('keyup', preventKeyEvent, true);

        // 移除滚动事件监听器
        window.removeEventListener('wheel', preventScroll);
        window.removeEventListener('touchmove', preventScroll);
    }

    // 阻止键盘事件
    function preventKeyEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 阻止滚动事件
    function preventScroll(e) {
        e.preventDefault();
    }

    // 创建遮罩层
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色背景
        overlay.style.zIndex = '999998';
        overlay.style.pointerEvents = 'none'; // 遮罩层不与用户交互
        document.body.appendChild(overlay);
    }

    // 移除遮罩层
    function removeOverlay() {
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // 创建弹窗并放置在页面正中间
    function createPopup() {
        const popup = document.createElement('div');
        popup.id = 'customPopup';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)'; // 居中
        popup.style.backgroundColor = '#fff';
        popup.style.border = '2px solid #000';
        popup.style.borderRadius = '15px';
        popup.style.padding = '20px';
        popup.style.zIndex = '999999';
        popup.style.fontSize = '18px';
        popup.style.textAlign = 'center';
        popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        popup.style.pointerEvents = 'auto'; // 保证弹窗可以交互
        popup.innerHTML = `
            <p>你要看的是？</p>
            <div id="usefulOption" style="display: inline-block; margin: 10px; padding: 10px; border: 2px solid #000; border-radius: 10px; cursor: pointer;">有用的</div>
            <div id="uselessOption" style="display: inline-block; margin: 10px; padding: 10px; border: 2px solid #000; border-radius: 10px; cursor: pointer;">没用的</div>
        `;
        document.body.appendChild(popup);

        // 监听用户选择
        document.getElementById('usefulOption').addEventListener('click', () => {
            closePopup();
        });
        document.getElementById('uselessOption').addEventListener('click', () => {
            startCountdown();
            closePopup();
        });
    }

    // 关闭弹窗
    function closePopup() {
        document.getElementById('customPopup').remove();
        removeOverlay();
        enableInteractions();
    }

    // 创建倒计时窗口并固定到右下角
    let countdownInterval;
    let countdownWindow;
    function createCountdown() {
        countdownWindow = document.createElement('div');
        countdownWindow.id = 'countdownTimer';
        countdownWindow.style.position = 'fixed';
        countdownWindow.style.bottom = '20px';
        countdownWindow.style.right = '20px';
        countdownWindow.style.padding = '20px';
        countdownWindow.style.backgroundColor = '#fff';
        countdownWindow.style.border = '2px solid #000';
        countdownWindow.style.borderRadius = '10px';
        countdownWindow.style.fontSize = '24px';
        countdownWindow.style.zIndex = '999998';
        countdownWindow.innerText = '剩余时间: 05:00'; // 设置为5分钟
        document.body.appendChild(countdownWindow);

        let timeLeft = total; // 总限额时长
        countdownInterval = setInterval(function() {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60); // 计算剩余的分钟数
            const seconds = timeLeft % 60; // 计算剩余的秒数
            countdownWindow.innerText = `剩余时间: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // 在剩余告警时长时移动到页面中间并改变字体
            if (timeLeft <= alarm) {
                countdownWindow.style.left = '50%';
                countdownWindow.style.transform = 'translateX(-50%)';
                countdownWindow.style.fontSize = '36px';
                countdownWindow.style.color = 'red';

                // 保证窗口大小固定
                countdownWindow.style.width = '275px'; // 固定宽度
                countdownWindow.style.height = '60px'; // 固定高度

                // 退出全屏并禁止全屏
                exitFullscreen();
                disableFullscreen();
            }

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                closeTab();
            }

            // 动态调整倒计时窗口位置
            adjustCountdownPosition();
        }, 1000);
    }

    // 退出全屏并反复检查退出全屏
    function exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen(); // 退出全屏
        }
    }

    // 禁止全屏
    function disableFullscreen() {
        // 每100ms强制退出全屏
        setInterval(exitFullscreen, 100);
    }

    // 调整倒计时窗口的位置
    function adjustCountdownPosition() {
        if (countdownWindow) {
            // 获取视窗宽高
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // 如果倒计时窗口处于页面中间
            if (countdownWindow.style.left === '50%' && countdownWindow.style.transform === 'translateX(-50%)') {
                countdownWindow.style.top = `${(windowHeight / 2) - (countdownWindow.offsetHeight / 2)}px`;
            } else {
                // 确保窗口固定在右下角
                countdownWindow.style.bottom = '20px';
                countdownWindow.style.right = '20px';
            }
        }
    }

    // 关闭当前标签页
    function closeTab() {
        window.close();
    }

    // 初始化功能
    function initialize() {
        disableInteractions(); // 禁止网页交互和滚动
        createOverlay(); // 创建遮罩层
        createPopup(); // 创建弹窗
    }

    // 初始化倒计时
    function startCountdown() {
        enableInteractions(); // 恢复网页交互
        createCountdown(); // 创建倒计时窗口
    }

    // 执行初始化
    initialize();
})();
