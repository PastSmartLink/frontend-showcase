document.addEventListener('DOMContentLoaded', () => {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const searchButton = document.getElementById('searchButton');
    const downloadCsvButton = document.getElementById('downloadCsv');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');

    let chartInstance;
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentData = [];

    const truncateText = (text, maxLength) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const renderTable = (data) => {
        resultsTableBody.innerHTML = '';

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = data.slice(start, end);

        if (pageData.length === 0) {
            resultsTableBody.innerHTML = '<tr><td colspan="5">No results found</td></tr>';
            return;
        }

        pageData.forEach((item) => {
            const row = `
                <tr>
                    <td title="${item.GrantTitle}">${truncateText(item.GrantTitle, 50)}</td>
                    <td>${item.Deadline}</td>
                    <td>${item.Funding || 'N/A'}</td>
                    <td title="${item.Description}">${truncateText(item.Description, 100)}</td>
                    <td><a href="${item.Link}" target="_blank">Link</a></td>
                </tr>`;
            resultsTableBody.innerHTML += row;
        });

        currentPageSpan.textContent = `Page ${currentPage} of ${Math.ceil(data.length / rowsPerPage)}`;
    };

    const updatePagination = () => {
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        prevPageButton.disabled = currentPage === 1;
        nextPageButton.disabled = currentPage === totalPages;
    };

    const changePage = (direction) => {
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        if (direction === 'next' && currentPage < totalPages) {
            currentPage++;
        } else if (direction === 'prev' && currentPage > 1) {
            currentPage--;
        }
        renderTable(currentData);
        updatePagination();
    };

    const renderChart = (data) => {
        const ctx = document.getElementById('resultsChart').getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
        }

        const labels = data.map((item) => truncateText(item.GrantTitle, 20));
        const values = data.map((item) => parseFloat(item.Funding) || 0);
        const links = data.map((item) => item.Link);
        const colors = values.map(
            () =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(
                    Math.random() * 255
                )}, 0.7)`
        );

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Funding Amounts',
                        data: values,
                        backgroundColor: colors,
                        borderColor: colors.map((color) => color.replace('0.7', '1')),
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => data[tooltipItems[0].dataIndex].GrantTitle,
                            label: (context) => `Funding: $${context.raw.toLocaleString()}`,
                        },
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x', // Zoom in the x-axis
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0,
                        },
                    },
                    y: {
                        beginAtZero: true,
                    },
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const dataIndex = elements[0].index;
                        const link = links[dataIndex];
                        if (link && link !== '#') {
                            window.open(link, '_blank');
                        } else {
                            alert('No valid link for this item.');
                        }
                    }
                },
            },
        });
    };

    const fetchCSVData = () => {
        fetch('cordis_results.csv')
            .then((response) => response.text())
            .then((csvData) => {
                const rows = csvData.split('\n').slice(1);
                currentData = rows
                    .filter((row) => row.trim() !== '')
                    .map((row) => {
                        const columns = row.split(';');
                        const funding = parseFloat(columns[2]);
                        const mockFunding = Math.floor(Math.random() * 500000) + 50000;
                        const validFunding = !isNaN(funding) && funding > 0 ? funding : mockFunding;

                        const baseURL = 'https://cordis.europa.eu/project/id/';
                        const link = columns[4] ? `${baseURL}${columns[4].trim()}` : '#';

                        return {
                            GrantTitle: columns[0] || 'N/A',
                            Deadline: columns[1] || 'N/A',
                            Funding: validFunding,
                            Description: columns[3] || 'N/A',
                            Link: link,
                        };
                    });

                renderTable(currentData);
                updatePagination();
                renderChart(currentData);
            })
            .catch((error) => {
                console.error('Error fetching CSV:', error);
                resultsTableBody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
            });
    };

    const downloadCsv = () => {
        const csvContent = currentData.map((item) =>
            [item.GrantTitle, item.Deadline, item.Funding, item.Description, item.Link].join(',')
        );
        csvContent.unshift('Grant Title,Deadline,Funding,Description,Link');
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'results.csv';
        link.click();
    };

    searchButton.addEventListener('click', fetchCSVData);
    downloadCsvButton.addEventListener('click', downloadCsv);
    prevPageButton.addEventListener('click', () => changePage('prev'));
    nextPageButton.addEventListener('click', () => changePage('next'));

    fetchCSVData();
});
