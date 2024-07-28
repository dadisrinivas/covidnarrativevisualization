<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Inspect TopoJSON</title>
    <script src="https://d3js.org/d3.v6.min.js"></script>
    <script src="https://d3js.org/topojson.v1.min.js"></script>
</head>
<body>
    <script>
        d3.json("https://d3js.org/us-10m.v1.json").then(function(usMapData) {
            console.log('US Map Data:', usMapData);
            const states = topojson.feature(usMapData, usMapData.objects.states).features;
            console.log('States:', states);
            console.log('First State Feature:', states[0]);
            // Inspect the properties of the first state feature
            console.log('Properties of First State:', states[0].properties);
        }).catch(function(error) {
            console.error('Error loading or parsing data:', error);
        });
    </script>
</body>
</html>
