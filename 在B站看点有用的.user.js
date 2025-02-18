// ==UserScript==
// @name         在B站看点有用的
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  弹窗询问Bilibili内容是否有用，没用则倒计时后关闭标签页；统计观看内容次数，以供用户自我反思
// @author       壹位姜
// @match        https://www.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
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

    // 默认配置
    let total = GM_getValue('total', 1800); // 总限额时长（秒）
    let alarm = GM_getValue('alarm', 300); // 告警时长（秒）

    // 如果当前URL中包含"BV"，则继续执行脚本，否则终止执行
    if (!window.location.href.includes('BV')) {
        return; // 如果没有"BV"字样，直接退出
    }

    // 获取当前日期
    const currentDate = new Date().toISOString().split('T')[0]; // 获取YYYY-MM-DD格式的日期

    // 获取上次倒计时的日期，如果今天的日期和上次存储的日期不同，重置倒计时
    let lastDate = GM_getValue('lastDate');
    if (lastDate !== currentDate) {
        GM_setValue('lastDate', currentDate);
        GM_setValue('timeLeft', total); // 重置为 总限额时长
    }

    // 倒计时剩余时间（单位：秒）
    let timeLeft = GM_getValue('timeLeft', total);

    // 禁止网页的互动和滚动，包括键盘操作
    function disableInteractions() {
        document.documentElement.style.overflow = 'hidden'; // 禁止html元素滚动
        document.body.style.overflow = 'hidden'; // 禁止body元素滚动
        document.documentElement.style.touchAction = 'none'; // 禁止触摸操作
        document.body.style.touchAction = 'none'; // 禁止触摸操作
        document.body.style.pointerEvents = 'none'; // 禁止所有交互

        const inputs = document.querySelectorAll('input, textarea, select, button, a');
        inputs.forEach((element) => {
            element.disabled = true; // 禁用所有输入控件
        });

        window.addEventListener('keydown', preventKeyEvent, true);
        window.addEventListener('keypress', preventKeyEvent, true);
        window.addEventListener('keyup', preventKeyEvent, true);

        window.addEventListener('wheel', preventScroll, { passive: false });
        window.addEventListener('touchmove', preventScroll, { passive: false });
    }

    function enableInteractions() {
        document.documentElement.style.overflow = 'auto'; // 恢复html元素滚动
        document.body.style.overflow = 'auto'; // 恢复body元素滚动
        document.documentElement.style.touchAction = 'auto'; // 恢复触摸操作
        document.body.style.touchAction = 'auto'; // 恢复触摸操作
        document.body.style.pointerEvents = 'auto'; // 恢复交互

        const inputs = document.querySelectorAll('input, textarea, select, button, a');
        inputs.forEach((element) => {
            element.disabled = false; // 启用所有输入控件
        });

        window.removeEventListener('keydown', preventKeyEvent, true);
        window.removeEventListener('keypress', preventKeyEvent, true);
        window.removeEventListener('keyup', preventKeyEvent, true);

        window.removeEventListener('wheel', preventScroll);
        window.removeEventListener('touchmove', preventScroll);
    }

    function preventKeyEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }

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
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999998';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
    }

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
        popup.style.pointerEvents = 'auto';
        popup.innerHTML = `
            <p>你要看的是？</p>
            <div id="usefulOption" style="display: inline-block; margin: 10px; padding: 10px; border: 2px solid #000; border-radius: 10px; cursor: pointer;">有用的</div>
            <div id="uselessOption" style="display: inline-block; margin: 10px; padding: 10px; border: 2px solid #000; border-radius: 10px; cursor: pointer;">没用的</div>
        `;
        document.body.appendChild(popup);

        // 监听用户选择
        document.getElementById('usefulOption').addEventListener('click', () => {
            promptCategoryAndSave('有用的');
            closePopup();
        });
        document.getElementById('uselessOption').addEventListener('click', () => {
            promptCategoryAndSave('没用的');
            startCountdown();
            closePopup();
        });

        // 新增函数：弹窗询问用户并保存类别
        function promptCategoryAndSave(option) {
            let category;
            while (!category) {
                category = prompt(`你选择了"${option}"，请填写当前内容属于什么类别：`);
                if (!category) {
                    alert("必须填写类别！");
                }
            }

            // 格式化时间戳为 YYYY-MM-DD-HH:mm:ss
            const timestamp = new Date().toISOString().replace("T", "-").replace(/\..+/, "").replace(/:/g, ":");

            // 获取对应分类的存储数据
            const key = option === "有用的" ? "useful" : "useless";
            let data = GM_getValue(key, []);

            // 添加新记录，格式为 "YYYYMMDD-HHmm: 类别"
            data.push(`${timestamp}: ${category}`);

            // 将更新后的数据保存回脚本专属空间
            GM_setValue(key, data);
        }
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
        countdownWindow.innerText = `剩余时间: ${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`;
        document.body.appendChild(countdownWindow);

        countdownInterval = setInterval(function() {
            timeLeft--;
            GM_setValue('timeLeft', timeLeft); // 保存倒计时剩余时间

            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownWindow.innerText = `剩余时间: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // 在剩余少于 告警时长 分钟时提示
            if (timeLeft <= alarm) {
                countdownWindow.style.left = '50%';
                countdownWindow.style.transform = 'translateX(-50%)';
                countdownWindow.style.fontSize = '36px';
                countdownWindow.style.color = 'red';
                countdownWindow.style.width = '275px'; // 固定宽度
                countdownWindow.style.height = '60px'; // 固定高度
                exitFullscreen();
                disableFullscreen();
            }

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                closeTab();
            }

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
        setInterval(exitFullscreen, 100); // 每100ms强制退出全屏
    }

    // 关闭当前标签页
    function closeTab() {
        window.close();
    }

    // 初始化功能
    function initialize() {
        disableInteractions();
        createOverlay();
        createPopup();
    }

    // 初始化倒计时
    function startCountdown() {
        enableInteractions();
        createCountdown();
    }

    // 注册Tampermonkey菜单命令
    GM_registerMenuCommand("查看数据", function() {
        const usefulData = GM_getValue('useful', []);
        const uselessData = GM_getValue('useless', []);
        const dataToDisplay = `有用的:\n${usefulData.join('\n')}\n\n没用的:\n${uselessData.join('\n')}`;
        alert(dataToDisplay || "暂无数据");
    });

    GM_registerMenuCommand("导出数据", function() {
        const usefulData = GM_getValue('useful', []);
        const uselessData = GM_getValue('useless', []);
        const dataToExport = `有用的:\n${usefulData.join('\n')}\n\n没用的:\n${uselessData.join('\n')}`;
        const blob = new Blob([dataToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'B站数据.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    GM_registerMenuCommand("修改配置", function() {
        const newTotal = prompt("请输入总限额时长（秒）：", total);
        const newAlarm = prompt("请输入告警时长（秒）：", alarm);
        if (newTotal && newAlarm) {
            total = parseInt(newTotal, 10);
            alarm = parseInt(newAlarm, 10);
            GM_setValue('total', total);
            GM_setValue('alarm', alarm);
            alert("配置已更新！");
        } else {
            alert("配置未更改！");
        }
    });

    // 执行初始化
    initialize();

})();
