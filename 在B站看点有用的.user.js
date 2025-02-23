// ==UserScript==
// @name         在B站看点有用的
// @namespace    http://tampermonkey.net/
// @version      1.1-pre3
// @description  弹窗询问Bilibili内容是否有用，没用则倒计时后关闭标签页；统计观看内容次数，以供用户自我反思
// @author       壹位姜
// @match        https://www.bilibili.com/*
// @icon         https://github.com/ABitGinger/BiLimit/raw/main/icon.ico
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

(function () {
    'use strict';

    // 默认配置
    let total = GM_getValue('total', 3600); // 总限额时长（秒）
    let alarm = GM_getValue('alarm', 300); // 告警时长（秒）

    // 如果当前URL中包含"BV"，则继续执行脚本，否则终止执行
    const shouldProceedWithBVLogic = window.location.href.includes('BV');

    if (!shouldProceedWithBVLogic) {
        // 跳过屏蔽和弹窗逻辑，但继续执行后续代码
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

        countdownInterval = setInterval(function () {
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
    if (typeof GM_closeTab === 'function') {
        GM_closeTab();
    } else {
        try {
            window.close();
        } catch (e) {
            console.error('尝试使用window.close()关闭标签页失败:', e);
        }
        if (!window.closed) {
            alert('自动关闭标签页失败。请手动关闭此标签页，或检查浏览器设置以允许脚本关闭窗口。');
        }
    }
}

    // 初始化功能
    function initialize() {
        if (shouldProceedWithBVLogic) {
            disableInteractions();
            createOverlay();
            createPopup();
        }
    }

    // 初始化倒计时
    function startCountdown() {
        enableInteractions();
        createCountdown();
    }

    // 注册Tampermonkey菜单命令
    GM_registerMenuCommand("查看数据", function () {
        const currentUsefulData = GM_getValue('useful', []);
        const currentUselessData = GM_getValue('useless', []);
        const popup = document.createElement('div');
        popup.id = 'dataPopup';
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
        popup.style.maxHeight = '80vh'; // 最大高度为视口高度的80%
        popup.style.overflowY = 'auto'; // 允许垂直滚动

        const dataToDisplay = `有用的:<br>${currentUsefulData.join('<br>')}<br><br>没用的:<br>${currentUselessData.join('<br>')}`;
        popup.innerHTML = dataToDisplay || "暂无数据";

        const closeButton = document.createElement('div');
        closeButton.innerText = '❌';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.fontSize = '24px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.color = 'red';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => {
            document.body.removeChild(popup);
        };
        popup.appendChild(closeButton);

        document.body.appendChild(popup);
    });

    GM_registerMenuCommand("生成图表", function () {
        const currentUsefulData = GM_getValue('useful', []);
        const currentUselessData = GM_getValue('useless', []);

        // Count occurrences of each category
        const countCategories = (data) => {
            return data.reduce((acc, entry) => {
                const category = entry.split(': ')[1];
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {});
        };

        const usefulCounts = countCategories(currentUsefulData);
        const uselessCounts = countCategories(currentUselessData);

        // Prepare data for charts
        const prepareChartData = (counts) => {
            return {
                labels: Object.keys(counts),
                datasets: [{
                    label: '观看次数',
                    data: Object.values(counts),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                }]
            };
        };

        const usefulChartData = prepareChartData(usefulCounts);
        const uselessChartData = prepareChartData(uselessCounts);

        // Create a new window to display charts
        const chartWindow = window.open('', '_blank');
        chartWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>观看统计图表</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            </head>
            <body>
                <h2>有用的观看统计</h2>
                <canvas id="usefulChart" width="400" height="200"></canvas>
                <h2>没用的观看统计</h2>
                <canvas id="uselessChart" width="400" height="200"></canvas>
                <h2>有用的观看占比</h2>
                <canvas id="usefulPieChart" width="400" height="200"></canvas>
                <h2>没用的观看占比</h2>
                <canvas id="uselessPieChart" width="400" height="200"></canvas>
                <script>
                    const usefulCtx = document.getElementById('usefulChart').getContext('2d');
                    const uselessCtx = document.getElementById('uselessChart').getContext('2d');

                    new Chart(usefulCtx, {
                        type: 'bar',
                        data: ${JSON.stringify(usefulChartData)},
                        options: {
                            responsive: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });

                    new Chart(uselessCtx, {
                        type: 'bar',
                        data: ${JSON.stringify(uselessChartData)},
                        options: {
                            responsive: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });

                    // 添加有用的饼图
                    const usefulPieCtx = document.getElementById('usefulPieChart').getContext('2d');
                    new Chart(usefulPieCtx, {
                        type: 'pie',
                        data: ${JSON.stringify(usefulChartData)},
                        options: {
                            responsive: false,
                        }
                    });

                    // 添加没用的饼图
                    const uselessPieCtx = document.getElementById('uselessPieChart').getContext('2d');
                    new Chart(uselessPieCtx, {
                        type: 'pie',
                        data: ${JSON.stringify(uselessChartData)},
                        options: {
                            responsive: false,
                        }
                    });
                </script>
            </body>
            </html>
        `);
        chartWindow.document.close();
    });

    // 导入数据功能
    GM_registerMenuCommand("导入数据", function () {
        const input = prompt("请选择导入模式：\n1. 追加到现有数据\n2. 覆盖现有数据", "1");
        // if (!input) return;

        const mode = parseInt(input, 10);
        if (![1, 2].includes(mode)) {
            alert("无效的选择！");
            return;
        }

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const [usefulData, uselessData] = content.split('\n\n没用的:\n');

                const parseData = (data) => data.split('\n').filter(Boolean);

                if (mode === 2) { // 覆盖模式
                    GM_setValue('useful', parseData(usefulData.replace('有用的:\n', '')));
                    GM_setValue('useless', parseData(uselessData));
                    alert("数据已覆盖！");
                } else { // 追加模式
                    const currentUseful = GM_getValue('useful', []);
                    const currentUseless = GM_getValue('useless', []);
                    GM_setValue('useful', [...currentUseful, ...parseData(usefulData.replace('有用的:\n', ''))]);
                    GM_setValue('useless', [...currentUseless, ...parseData(uselessData)]);
                    alert("数据已追加！");
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    });

    GM_registerMenuCommand("导出数据", function () {
        const usefulData = GM_getValue('useful', []);
        const uselessData = GM_getValue('useless', []);
        const dataToExport = `有用的:\n${usefulData.join('\n')}\n\n没用的:\n${uselessData.join('\n')}`;
        const blob = new Blob([dataToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // 生成时间戳，格式为 YYYY-MM-DD-HH:mm:ss
        const timestamp = new Date().toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, ':');
        a.download = `Bilimit观看数据_${timestamp}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // 新增：清空数据功能
    GM_registerMenuCommand("清除数据", function () {
        const input = prompt("请选择要清除的数据：\n1. 上次数据\n2. 全部数据", "1");
        if (input === 'gingerreset') {
            timeLeft = total;
            GM_setValue('timeLeft', timeLeft);
            alert(`已重置倒计时为限额时长 ${total} 秒`);
            return;
        }

        const gingerMatch = input.match(/^ginger(\d+)$/);
        if (gingerMatch) {
            const debugSeconds = parseInt(gingerMatch[1], 10);
            if (!isNaN(debugSeconds) && debugSeconds >= 0) {
                timeLeft = debugSeconds;
                GM_setValue('timeLeft', timeLeft);
                alert(`调试模式：已将当日剩余时长设置为 ${debugSeconds} 秒`);
                return;
            } else {
                alert("无效的调试指令！");
                return;
            }
        }
        const confirmation = input;
        if (!confirmation) return;

        const currentUsefulData = GM_getValue('useful', []);
        const currentUselessData = GM_getValue('useless', []);

        if (confirmation === "2") { // 清除全部数据
            if (confirm("警告：您即将清除全部数据，此操作不可逆！确定继续吗？")) {
                GM_setValue('useful', []);
                GM_setValue('useless', []);
                alert("已清除全部数据！");
            }
        } else if (confirmation === "1") { // 清除上次数据
            // 检查是否有数据可清除
            const allData = [...currentUsefulData, ...currentUselessData];
            if (allData.length === 0) {
                alert("没有数据可清除！");
                return;
            }

            // 合并所有数据并找到时间最晚的一条记录
            let latestRecord = null;
            let latestTime = null;

            for (const record of allData) {
                const [timestamp] = record.split(': ');
                if (!latestTime || timestamp > latestTime) {
                    latestTime = timestamp;
                    latestRecord = record;
                }
            }

            // 从原始数据中删除时间最晚的记录，并告知用户清除的具体内容
            if (latestRecord) {
                const usefulIndex = currentUsefulData.indexOf(latestRecord);
                if (usefulIndex !== -1) {
                    currentUsefulData.splice(usefulIndex, 1);
                    alert(`已清除上次数据：\n${latestRecord}`);
                } else {
                    const uselessIndex = currentUselessData.indexOf(latestRecord);
                    if (uselessIndex !== -1) {
                        currentUselessData.splice(uselessIndex, 1);
                        alert(`已清除上次数据：\n${latestRecord}`);
                    }
                }
            }

            GM_setValue('useful', currentUsefulData);
            GM_setValue('useless', currentUselessData);
        } else {
            alert("无效的选择！");
        }
    });

    GM_registerMenuCommand("修改配置", function () {
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
