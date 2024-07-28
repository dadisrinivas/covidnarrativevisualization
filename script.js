document.addEventListener("DOMContentLoaded", function() {
    const scenes = [createScene1, createScene2, createScene3];
    let currentSceneIndex = 0;

    const parameters = {
        currentScene: 0,
        selectedState: null,
        selectedMetric: null,
        timeSeriesConfirmed: null,
        timeSeriesDeaths: null,
        usMapData: null
    };

    const svg = d3.select("#visualization").append("svg")
        .attr("width", 960)
        .attr("height", 600);

    // Load datasets
    Promise.all([
        d3.csv("data/time_series_covid19_confirmed_US.csv"),
        d3.csv("data/time_series_covid19_deaths_US.csv"),
        d3.json("https://unpkg.com/us-atlas/states-10m.json")
    ]).then(function([timeSeriesConfirmed, timeSeriesDeaths, usMapData]) {
        console.log('Datasets loaded successfully.');
        console.log('Confirmed Cases Data:', timeSeriesConfirmed);
        console.log('Deaths Data:', timeSeriesDeaths);
        console.log('US Map Data:', usMapData);

        parameters.timeSeriesConfirmed = timeSeriesConfirmed;
        parameters.timeSeriesDeaths = timeSeriesDeaths;
        parameters.usMapData = usMapData;

        // Initialize the first scene
        scenes[0]();

        // Back button event listener
        d3.select("#back").on("click", function() {
            if (currentSceneIndex > 0) {
                currentSceneIndex--;
                parameters.currentScene = currentSceneIndex;
                scenes[currentSceneIndex]();
                updateButtons();
            }
        });

        // Update button states initially
        updateButtons();
    }).catch(function(error) {
        console.error('Error loading or parsing data:', error);
    });

    function updateButtons() {
        d3.select("#back").attr("disabled", currentSceneIndex === 0 ? "true" : null);
    }

    function createScene1() {
        svg.html(""); // Clear previous content
        console.log('Creating Scene 1: US Map');

        const projection = d3.geoAlbersUsa()
            .scale(1280)
            .translate([480, 300]);

        const path = d3.geoPath().projection(projection);

        const us = parameters.usMapData;
        const timeSeriesConfirmed = parameters.timeSeriesConfirmed;

        if (!us || !timeSeriesConfirmed) {
            console.error('US map data or confirmed cases data is missing.');
            return;
        }

        // Aggregate data by state
        const stateCases = d3.rollup(timeSeriesConfirmed, v => d3.sum(v, d => +d[Object.keys(d)[Object.keys(d).length - 1]]), d => d.Province_State);

        // Find the state with the highest number of cases
        let maxCasesState = "";
        let maxCases = 0;
        stateCases.forEach((cases, state) => {
            if (cases > maxCases) {
                maxCases = cases;
                maxCasesState = state;
            }
        });

        // Log the aggregated data
        console.log('State Cases:', stateCases);

        // Draw map
        const states = topojson.feature(us, us.objects.states).features;
        console.log('States:', states);

        svg.append("g")
            .attr("class", "states")
            .attr("transform", "translate(60, 20)") // Center-align the map
            .selectAll("path")
            .data(states)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const stateName = d.properties.name || d.properties.NAME || d.properties.StateName || d.properties.state_name;
                const cases = stateCases.get(stateName) || 0;
                return d3.interpolateReds(cases / 100000);
            })
            .attr("stroke", "#fff")
            .on("click", function(event, d) {
                parameters.selectedState = d.properties.name || d.properties.NAME || d.properties.StateName || d.properties.state_name;
                currentSceneIndex++;
                parameters.currentScene = currentSceneIndex;
                scenes[currentSceneIndex]();
                updateButtons();
            })
            .append("title")
            .text(d => `Please click to get detailed case information`);

        // Add title
        svg.append("text")
            .attr("x", 480)
            .attr("y", 40) // Adjust title position to avoid getting cut
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text("COVID-19 Cases by State");

        // Add annotation for the state with the highest cases
        const maxStateFeature = states.find(d => (d.properties.name || d.properties.NAME || d.properties.StateName || d.properties.state_name) === maxCasesState);
        if (maxStateFeature) {
            svg.append("text")
                .attr("x", path.centroid(maxStateFeature)[0] + 60)
                .attr("y", path.centroid(maxStateFeature)[1] + 20)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "black")
                .text(`Highest cases: ${maxCasesState} (${maxCases})`);
        }
    }

    function createScene2() {
        svg.html(""); // Clear previous content
        console.log('Creating Scene 2: State Overview');

        const timeSeriesConfirmed = parameters.timeSeriesConfirmed;
        const timeSeriesDeaths = parameters.timeSeriesDeaths;

        const stateConfirmed = timeSeriesConfirmed.filter(d => d.Province_State === parameters.selectedState);
        const stateDeaths = timeSeriesDeaths.filter(d => d.Province_State === parameters.selectedState);

        const confirmedCases = d3.sum(stateConfirmed, d => +d[Object.keys(d)[Object.keys(d).length - 1]]);
        const deaths = d3.sum(stateDeaths, d => +d[Object.keys(d)[Object.keys(d).length - 1]]);
        const recovered = 0; // Placeholder, as recovered data is not available

        const data = [
            { metric: "Cases", value: confirmedCases },
            { metric: "Deaths", value: deaths },
            { metric: "Recovered", value: recovered }
        ];

        // Log the data for debugging
        console.log('State Data:', data);

        // Set up margins and dimensions
        const margin = { top: 20, right: 20, bottom: 100, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${(svg.attr("width") - width) / 2},${margin.top})`);

        const x = d3.scaleBand().rangeRound([0, width]).padding(0.1);
        const y = d3.scaleLinear().rangeRound([height, 0]);

        x.domain(data.map(d => d.metric));
        y.domain([0, d3.max(data, d => d.value)]);

        // Add x-axis
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Add y-axis
        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y).ticks(10));

        // Add bars
        g.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.metric))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", "darkblue")
            .on("click", function(event, d) {
                parameters.selectedMetric = d.metric;
                currentSceneIndex++;
                parameters.currentScene = currentSceneIndex;
                scenes[currentSceneIndex]();
                updateButtons();
            })
            .append("title")
            .text("Please click to identify the trends over a period of time");

        // Add title
        svg.append("text")
            .attr("x", (svg.attr("width") / 2))
            .attr("y", margin.top + 10)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text(`COVID-19 ${parameters.selectedState} Overview`);

        // Add x-axis label
        svg.append("text")
            .attr("transform", `translate(${(svg.attr("width") - width) / 2 + width / 2}, ${height + margin.top + 80})`)
            .style("text-anchor", "middle")
            .text("Metric");

        // Add y-axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", margin.left - 90)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Count");

        // Add annotation for the highest value
        const maxValueData = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);
        svg.append("text")
            .attr("x", (svg.attr("width") / 2))
            .attr("y", margin.top + 40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "black")
            .text(`Highest ${maxValueData.metric}: ${maxValueData.value}`);
    }

    function createScene3() {
        svg.html(""); // Clear previous content
        console.log('Creating Scene 3: Metric Trends');

        const timeSeriesData = parameters.selectedMetric === "Cases" ? parameters.timeSeriesConfirmed : parameters.timeSeriesDeaths;
        const stateData = timeSeriesData.filter(d => d.Province_State === parameters.selectedState);

        const dates = Object.keys(stateData[0]).slice(11); // Skip non-date columns
        const values = dates.map(date => d3.sum(stateData, d => +d[date]));

        const data = dates.map((date, i) => ({
            date: new Date(date),
            value: values[i]
        }));

        // Log the data for debugging
        console.log('Trends Data:', data);

        // Set up margins and dimensions
        const margin = { top: 20, right: 20, bottom: 100, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${(svg.attr("width") - width) / 2},${margin.top})`);

        const x = d3.scaleTime().rangeRound([0, width]);
        const y = d3.scaleLinear().rangeRound([height, 0]);

        x.domain(d3.extent(data, d => d.date));
        y.domain([0, d3.max(data, d => d.value)]);

        // Add x-axis
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add y-axis
        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y).ticks(10));

        // Add line
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value));

        g.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Add points
        g.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.value))
            .attr("r", 5)
            .attr("fill", "steelblue");

        // Add title
        svg.append("text")
            .attr("x", (svg.attr("width") / 2))
            .attr("y", margin.top + 10)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .text(`COVID-19 ${parameters.selectedState} ${parameters.selectedMetric} Trends`);

        // Add x-axis label
        svg.append("text")
            .attr("transform", `translate(${(svg.attr("width") - width) / 2 + width / 2}, ${height + margin.top + 80})`)
            .style("text-anchor", "middle")
            .text("Date");

        // Add y-axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", margin.left - 90)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Number of Cases");

        // Add annotation for a significant point (e.g., peak value)
        const maxValuePoint = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);
        svg.append("text")
            .attr("x", x(maxValuePoint.date) + (svg.attr("width") - width) / 2)
            .attr("y", y(maxValuePoint.value) + margin.top - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "black")
            .text(`Peak: ${maxValuePoint.value} on ${maxValuePoint.date.toDateString()}`);
    }
});
