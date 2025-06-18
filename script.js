        let currentData = {};
        let history = JSON.parse(localStorage.getItem("history") || "[]");  // will hold saved calculations
        // Если будут демо-данные, можно пересчитать прибыль так:
        // if (history[0]) history[0].profit = calculateMetrics(history[0].data).netProfit;
        let profitChart, funnelChart, channelsChart, scenarioChart, roiChart;

        // Каналы и их настройки
        const channels = {
            habr: { name: 'Хабр', type: 'organic' },
            pikabu: { name: 'Пикабу', type: 'organic' },
            vc: { name: 'VC', type: 'organic' },
            tproger: { name: 'tProger', type: 'organic' },
            proglib: { name: 'Proglib', type: 'organic' },
            instagram_organic: { name: 'Instagram (органика)', type: 'organic' },
            instagram: { name: 'Instagram (реклама)', type: 'paid' },
            leadmagnet: { name: 'Лид-магнит', type: 'direct' },
            other: { name: 'Другие', type: 'direct' }
        };

        function formatNumber(num) {
            return Math.round(num).toLocaleString('ru-RU');
        }

        function getInputValues() {
            const data = {
                channels: {},
                convToPayment: parseFloat(document.getElementById('convToPayment').value) || 0,
                convToPurchase: parseFloat(document.getElementById('convToPurchase').value) || 0,
                avgCheck: parseFloat(document.getElementById('avgCheck').value) || 0,
                otherIncome: parseFloat(document.getElementById('otherIncome').value) || 0,
                opExpenses: parseFloat(document.getElementById('opExpenses').value) || 0,
                subscriptions: parseFloat(document.getElementById('subscriptions').value) || 0,
                taxRate: parseFloat(document.getElementById('taxes').value) || 0
            };

            // Собираем данные по каналам
            Object.keys(channels).forEach(channel => {
                data.channels[channel] = {
                    coverage: parseFloat(document.getElementById(channel).value) || 0,
                    conversion: parseFloat(document.getElementById(channel + '_conv').value) || 0,
                    cost: channel === 'instagram' ? (parseFloat(document.getElementById(channel + '_cost').value) || 0) : 0
                };
            });

            return data;
        }

        function calculateChannelMetrics(data) {
            const channelMetrics = {};
            let totalTraffic = 0;
            let totalSales = 0;

            Object.keys(channels).forEach(channel => {
                const channelData = data.channels[channel];
                const traffic = channelData.coverage * channelData.conversion / 100;
                const visitorsToPayment = traffic * data.convToPayment / 100;
                const sales = visitorsToPayment * data.convToPurchase / 100;
                const revenue = sales * data.avgCheck;
                const cost = channelData.cost || 0;
                const profit = revenue - cost;
                const roi = cost > 0 ? ((revenue - cost) / cost * 100) : (revenue > 0 ? Infinity : 0);

                channelMetrics[channel] = {
                    name: channels[channel].name,
                    type: channels[channel].type,
                    coverage: channelData.coverage,
                    conversion: channelData.conversion,
                    traffic: traffic,
                    sales: sales,
                    revenue: revenue,
                    cost: cost,
                    profit: profit,
                    roi: roi
                };

                totalTraffic += traffic;
                totalSales += sales;
            });

            return { channelMetrics, totalTraffic, totalSales };
        }

        function calculateMetrics(data) {
            const { channelMetrics, totalTraffic, totalSales } = calculateChannelMetrics(data);
            
            const totalRevenue = totalSales * data.avgCheck + data.otherIncome;
            const totalAdCosts = Object.values(channelMetrics).reduce((sum, ch) => sum + ch.cost, 0);
            const taxes = totalRevenue * data.taxRate / 100;
            const totalExpenses = data.opExpenses + data.subscriptions + totalAdCosts + taxes;
            const netProfit = totalRevenue - totalExpenses;
            const roi = totalExpenses > 0 ? ((totalRevenue - totalExpenses) / totalExpenses * 100) : 0;

            return {
                channelMetrics,
                totalTraffic,
                totalSales,
                totalRevenue,
                totalExpenses,
                netProfit,
                roi,
                totalAdCosts,
                taxes
            };
        }

        function calculate() {
            currentData = getInputValues();
            const metrics = calculateMetrics(currentData);
            
            // Обновляем KPI
            document.getElementById('kpi-profit').textContent = `₽${formatNumber(metrics.netProfit)}`;
            document.getElementById('kpi-roi').textContent = `${Math.round(metrics.roi)}%`;
            document.getElementById('kpi-traffic').textContent = formatNumber(metrics.totalTraffic);
            document.getElementById('kpi-sales').textContent = formatNumber(metrics.totalSales);
            
            // Строим дерево
            updateTree(metrics);
            
            // Обновляем графики
            updateCharts(metrics);
            
            // Обновляем таблицу ROI
            updateROITable(metrics);
            
            // Обновляем сценарии
            updateScenarios();
        }

        function updateTree(metrics) {
            let channelTreeNodes = '';
            Object.entries(metrics.channelMetrics).forEach(([key, channel]) => {
                if (channel.traffic > 0) {
                    channelTreeNodes += `
                        <div class="tree-node level-4">
                            <span>
                                <strong>${channel.name}</strong>
                                <div class="node-formula">${formatNumber(channel.coverage)} охватов × ${channel.conversion}% CTR = ${formatNumber(channel.traffic)} кликов</div>
                            </span>
                            <span class="node-value">${formatNumber(channel.traffic)} чел.</span>
                        </div>
                    `;
                }
            });

            const tree = `
                <div class="tree-node level-0 result-highlight">
                    <span>
                        <strong>Чистая прибыль за период</strong>
                        <div class="node-formula">Общий доход - Общие расходы</div>
                    </span>
                    <span class="node-value">₽${formatNumber(metrics.netProfit)}</span>
                </div>
                
                <div class="tree-node level-1">
                    <span>
                        <strong>Общий доход</strong>
                        <div class="node-formula">Доход с продаж + Доход с других продуктов</div>
                    </span>
                    <span class="node-value">₽${formatNumber(metrics.totalRevenue)}</span>
                </div>
                
                <div class="tree-node level-2">
                    <span>
                        <strong>Доход с продаж</strong>
                        <div class="node-formula">Количество продаж × Средний чек</div>
                    </span>
                    <span class="node-value">₽${formatNumber(metrics.totalSales * currentData.avgCheck)}</span>
                </div>
                
                <div class="tree-node level-3">
                    <span>
                        <strong>Количество продаж</strong>
                        <div class="node-formula">Нажали "Купить" × Конверсия оплаты (${currentData.convToPurchase}%)</div>
                    </span>
                    <span class="node-value">${formatNumber(metrics.totalSales)}</span>
                </div>
                
                <div class="tree-node level-4">
                    <span>
                        <strong>Нажали кнопку "Купить"</strong>
                        <div class="node-formula">${formatNumber(metrics.totalTraffic)} посетителей × ${currentData.convToPayment}%</div>
                    </span>
                    <span class="node-value">${formatNumber(metrics.totalTraffic * currentData.convToPayment / 100)} чел.</span>
                </div>
                
                <div class="tree-node level-3">
                    <span>
                        <strong>Общий трафик на сайт</strong>
                        <div class="node-formula">Сумма трафика по всем каналам</div>
                    </span>
                    <span class="node-value">${formatNumber(metrics.totalTraffic)}</span>
                </div>
                
                ${channelTreeNodes}
                
                <div class="tree-node level-2">
                    <span>
                        <strong>Доход с других продуктов</strong>
                    </span>
                    <span class="node-value">₽${formatNumber(currentData.otherIncome)}</span>
                </div>
                
                <div class="tree-node level-1">
                    <span>
                        <strong>Общие расходы</strong>
                        <div class="node-formula">Операционные + Подписки + Реклама + Налоги</div>
                    </span>
                    <span class="node-value">₽${formatNumber(metrics.totalExpenses)}</span>
                </div>
                
                <div class="tree-node level-2">
                    <span>Операционные расходы</span>
                    <span class="node-value">₽${formatNumber(currentData.opExpenses)}</span>
                </div>
                
                <div class="tree-node level-2">
                    <span>Подписки</span>
                    <span class="node-value">₽${formatNumber(currentData.subscriptions)}</span>
                </div>
                
                <div class="tree-node level-2">
                    <span>Затраты на рекламу</span>
                    <span class="node-value">₽${formatNumber(metrics.totalAdCosts)}</span>
                </div>
                
                <div class="tree-node level-2">
                    <span>Налоги (${currentData.taxRate}% от дохода)</span>
                    <span class="node-value">₽${formatNumber(metrics.taxes)}</span>
                </div>
            `;
            
            document.getElementById('tree').innerHTML = tree;
            
            // Анимация изменений
            document.querySelectorAll('.tree-node').forEach(node => {
                node.classList.add('animate-change');
                setTimeout(() => node.classList.remove('animate-change'), 500);
            });
        }

        function updateROITable(metrics) {
            let tableHTML = `
                <div class="roi-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Канал</th>
                                <th>Охват</th>
                                <th>Клики (CTR)</th>
                                <th>Продажи</th>
                                <th>Доход</th>
                                <th>Затраты</th>
                                <th>Прибыль</th>
                                <th>ROI</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            Object.entries(metrics.channelMetrics).forEach(([key, channel]) => {
                if (channel.coverage > 0) {
                    const roiClass = channel.roi > 0 ? 'roi-positive' : 'roi-negative';
                    const roiText = channel.roi === Infinity ? '∞' : `${Math.round(channel.roi)}%`;
                    
                    tableHTML += `
                        <tr>
                            <td>${channel.name}</td>
                            <td>${formatNumber(channel.coverage)}</td>
                            <td>${formatNumber(channel.traffic)} (${channel.conversion}%)</td>
                            <td>${formatNumber(channel.sales)}</td>
                            <td>₽${formatNumber(channel.revenue)}</td>
                            <td>₽${formatNumber(channel.cost)}</td>
                            <td>₽${formatNumber(channel.profit)}</td>
                            <td class="${roiClass}">${roiText}</td>
                        </tr>
                    `;
                }
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('roi-table-container').innerHTML = tableHTML;
        }

        function updateCharts(metrics) {
            const ctx1 = document.getElementById('profitChart');
            const ctx2 = document.getElementById('funnelChart');
            const ctx3 = document.getElementById('channelsChart');
            const ctx4 = document.getElementById('roiChart');
            
            // График прибыли
            if (profitChart) profitChart.destroy();
            profitChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
                    datasets: [{
                        label: 'Прибыль',
                        data: [
                            metrics.netProfit * 0.7,
                            metrics.netProfit * 0.8,
                            metrics.netProfit * 0.9,
                            metrics.netProfit,
                            metrics.netProfit * 1.1,
                            metrics.netProfit * 1.2
                        ],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
            
            // Воронка конверсий по каналам
            if (funnelChart) funnelChart.destroy();
            const channelNames = [];
            const channelTraffic = [];
            const channelSales = [];
            
            Object.entries(metrics.channelMetrics).forEach(([key, channel]) => {
                if (channel.coverage > 0) {
                    channelNames.push(channel.name);
                    channelTraffic.push(channel.traffic);
                    channelSales.push(channel.sales);
                }
            });
            
            funnelChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: channelNames,
                    datasets: [{
                        label: 'Трафик',
                        data: channelTraffic,
                        backgroundColor: 'rgba(102, 126, 234, 0.6)'
                    }, {
                        label: 'Продажи',
                        data: channelSales,
                        backgroundColor: 'rgba(76, 175, 80, 0.6)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Эффективность каналов
            if (channelsChart) channelsChart.destroy();
            channelsChart = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: channelNames,
                    datasets: [{
                        data: channelTraffic,
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#4caf50',
                            '#ff9800',
                            '#f44336',
                            '#e91e63',
                            '#9c27b0',
                            '#3f51b5'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });

            // График ROI по каналам
            if (ctx4) {
                if (roiChart) roiChart.destroy();
                const roiData = [];
                const roiLabels = [];
                
                Object.entries(metrics.channelMetrics).forEach(([key, channel]) => {
                    if (channel.coverage > 0 && channel.roi !== Infinity) {
                        roiLabels.push(channel.name);
                        roiData.push(Math.round(channel.roi));
                    }
                });
                
                roiChart = new Chart(ctx4, {
                    type: 'bar',
                    data: {
                        labels: roiLabels,
                        datasets: [{
                            label: 'ROI %',
                            data: roiData,
                            backgroundColor: roiData.map(roi => roi >= 0 ? 'rgba(76, 175, 80, 0.6)' : 'rgba(244, 67, 54, 0.6)')
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }

        function updateScenarios() {
            const baseMetrics = calculateMetrics(currentData);
            
            const organicGrowth = parseFloat(document.getElementById('organic-growth').value) / 100;
            const adBudgetChange = parseFloat(document.getElementById('ad-budget').value) / 100;
            const conversionChange = parseFloat(document.getElementById('conversion-change').value) / 100;
            const checkChange = parseFloat(document.getElementById('check-change').value) / 100;
            
            // Создаем модифицированные данные
            const scenarioData = JSON.parse(JSON.stringify(currentData));
            
            // Модифицируем органические каналы
            Object.keys(channels).forEach(channel => {
                if (channels[channel].type === 'organic') {
                    scenarioData.channels[channel].coverage *= (1 + organicGrowth);
                }
                if (channels[channel].type === 'paid') {
                    scenarioData.channels[channel].coverage *= (1 + adBudgetChange);
                    scenarioData.channels[channel].cost *= (1 + adBudgetChange);
                }
                scenarioData.channels[channel].conversion *= (1 + conversionChange);
            });
            
            scenarioData.avgCheck *= (1 + checkChange);
            // Налоги автоматически пересчитаются от нового дохода
            
            const scenarioMetrics = calculateMetrics(scenarioData);
            
            // Обновляем UI
            document.getElementById('scenario-current').textContent = `₽${formatNumber(baseMetrics.netProfit)}`;
            document.getElementById('scenario-projected').textContent = `₽${formatNumber(scenarioMetrics.netProfit)}`;
            const change = baseMetrics.netProfit !== 0 ? 
                ((scenarioMetrics.netProfit - baseMetrics.netProfit) / Math.abs(baseMetrics.netProfit) * 100) : 0;
            document.getElementById('scenario-change').textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
            
            // График сценариев
            const ctx = document.getElementById('scenarioChart');
            if (scenarioChart) scenarioChart.destroy();
            scenarioChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Текущий', 'Прогноз'],
                    datasets: [{
                        label: 'Прибыль',
                        data: [baseMetrics.netProfit, scenarioMetrics.netProfit],
                        backgroundColor: ['rgba(102, 126, 234, 0.8)', 'rgba(76, 175, 80, 0.8)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            if (tabName === 'analytics' || tabName === 'roi' || tabName === 'scenarios') {
                setTimeout(() => {
                    calculate();
                }, 100);
            } else if (tabName === 'history') {
                updateHistoryList();
            }
        }

        function saveData() {
            document.getElementById('saveModal').style.display = 'flex';
        }

        function closeSaveModal() {
            document.getElementById('saveModal').style.display = 'none';
        }

        function confirmSave(event) {
            event.preventDefault();
            
            const name = document.getElementById('saveName').value;
            const description = document.getElementById('saveDescription').value;
            const data = getInputValues();
            const metrics = calculateMetrics(data);
            
            const saveItem = {
                id: Date.now(),
                name,
                description,
                date: new Date().toLocaleDateString('ru-RU'),
                data,
                metrics,
                profit: metrics.netProfit
            };
            
            history.unshift(saveItem);
            localStorage.setItem("history", JSON.stringify(history));
            updateHistoryList();
            
            closeSaveModal();
            alert('Расчет успешно сохранен!');
        }

        function loadDataModal() {
            updateLoadList();
            document.getElementById('loadModal').style.display = 'flex';
        }

        function closeLoadModal() {
            document.getElementById('loadModal').style.display = 'none';
        }

        function updateLoadList() {
            const loadList = document.getElementById('load-list');
            
            if (history.length === 0) {
                loadList.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Нет сохраненных расчетов</p>';
                return;
            }
            
            loadList.innerHTML = history.map(item => `
                <div class="history-item" onclick="loadCalculation(${item.id})">
                    <div>
                        <strong>${item.name}</strong>
                        <div class="history-date">${item.date}</div>
                        ${item.description ? `<div style="font-size: 12px; color: #666;">${item.description}</div>` : ''}
                    </div>
                    <div class="history-profit">₽${formatNumber(item.profit)}</div>
                </div>
            `).join('');
        }

        function updateHistoryList() {
            const historyList = document.getElementById('history-list');
            
            if (history.length === 0) {
                historyList.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">История пуста. Сохраните первый расчет!</p>';
                return;
            }
            
            historyList.innerHTML = history.map(item => `
                <div class="history-item" onclick="loadCalculation(${item.id})">
                    <div>
                        <strong>${item.name}</strong>
                        <div class="history-date">${item.date}</div>
                        ${item.description ? `<div style="font-size: 12px; color: #666;">${item.description}</div>` : ''}
                    </div>
                    <div class="history-profit">₽${formatNumber(item.profit)}</div>
                </div>
            `).join('');
        }

        function loadCalculation(id) {
            const item = history.find(h => h.id === id);
            if (!item) return;
            
            // Загружаем основные данные
            document.getElementById('convToPayment').value = item.data.convToPayment;
            document.getElementById('convToPurchase').value = item.data.convToPurchase;
            document.getElementById('avgCheck').value = item.data.avgCheck;
            document.getElementById('otherIncome').value = item.data.otherIncome;
            document.getElementById('opExpenses').value = item.data.opExpenses;
            document.getElementById('subscriptions').value = item.data.subscriptions;
            document.getElementById('taxes').value = item.data.taxRate || 6;
            
            // Загружаем данные по каналам
            if (item.data.channels) {
                Object.keys(item.data.channels).forEach(channel => {
                    if (document.getElementById(channel)) {
                        document.getElementById(channel).value = item.data.channels[channel].coverage;
                    }
                    if (document.getElementById(channel + '_conv')) {
                        document.getElementById(channel + '_conv').value = item.data.channels[channel].conversion;
                    }
                    if (channel === 'instagram' && item.data.channels[channel].cost && document.getElementById(channel + '_cost')) {
                        document.getElementById(channel + '_cost').value = item.data.channels[channel].cost;
                    }
                });
            }
            
            calculate();
            closeLoadModal();
            
            // Переключаемся на вкладку калькулятора
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelector('.tab').classList.add('active');
            document.getElementById('calculator').classList.add('active');
        }

        // Обработчики для слайдеров сценариев
        document.getElementById('organic-growth').addEventListener('input', function() {
            document.getElementById('organic-growth-value').textContent = this.value + '%';
            updateScenarios();
        });

        document.getElementById('ad-budget').addEventListener('input', function() {
            document.getElementById('ad-budget-value').textContent = this.value + '%';
            updateScenarios();
        });

        document.getElementById('conversion-change').addEventListener('input', function() {
            document.getElementById('conversion-change-value').textContent = this.value + '%';
            updateScenarios();
        });

        document.getElementById('check-change').addEventListener('input', function() {
            document.getElementById('check-change-value').textContent = this.value + '%';
            updateScenarios();
        });

        // Добавляем обработчики событий для всех полей ввода
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', calculate);
        });

        // Закрытие модальных окон по клику вне
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        // Первоначальный расчет
        calculate();
        updateHistoryList();
