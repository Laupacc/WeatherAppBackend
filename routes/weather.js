var express = require('express');
var router = express.Router();

const fetch = require('node-fetch');
const City = require('../models/cities');

const OWM_API_KEY = process.env.OWM_API_KEY;


// Get all cities from database
router.get('/', (req, res) => {
	City.find().then(data => {
		res.json({ weather: data });
	});
});


// Add city current weather
router.post('/current', (req, res) => {
	City.findOne({ cityName: { $regex: new RegExp(req.body.cityName, 'i') } }).then(dbData => {
		if (dbData === null) {
			fetch(`https://api.openweathermap.org/data/2.5/weather?q=${req.body.cityName}&appid=${OWM_API_KEY}&units=metric`)
				.then(response => response.json())
				.then(apiData => {
					// Creates new document with weather data
					const newCity = new City({
						cityName: req.body.cityName,
						main: apiData.weather[0].main,
						description: apiData.weather[0].description,
						icon: apiData.weather[0].icon,
						temp: apiData.main.temp,
						feels_like: apiData.main.feels_like,
						tempMin: apiData.main.temp_min,
						tempMax: apiData.main.temp_max,
						humidity: apiData.main.humidity,
						wind: apiData.wind.speed,
						clouds: apiData.clouds.all,
						rain: apiData.rain ? apiData.rain['1h'] : 0,
						snow: apiData.snow ? apiData.snow['1h'] : 0,
						sunrise: apiData.sys.sunrise,
						sunset: apiData.sys.sunset,
						lattitude: apiData.coord.lat,
						longitude: apiData.coord.lon,
					});

					// Finally save in database
					newCity.save().then(newDoc => {
						res.json({ result: true, weather: newDoc });
					});
				});
		} else {
			// City already exists in database
			res.json({ result: false, error: 'City already saved' });
		}
	});
});

// Add current location
router.post('/current/location', async (req, res) => {
	try {
		const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${req.body.lat}&lon=${req.body.lon}&appid=${OWM_API_KEY}&units=metric`);
		const apiData = await response.json();

		const existingCity = await City.findOne({ cityName: apiData.name });
		if (existingCity) {
			res.json({ result: false, error: 'City already saved' });
			return;
		}

		const newCity = new City({
			cityName: apiData.name,
			main: apiData.weather[0].main,
			description: apiData.weather[0].description,
			icon: apiData.weather[0].icon,
			temp: apiData.main.temp,
			feels_like: apiData.main.feels_like,
			tempMin: apiData.main.temp_min,
			tempMax: apiData.main.temp_max,
			humidity: apiData.main.humidity,
			wind: apiData.wind.speed,
			clouds: apiData.clouds.all,
			rain: apiData.rain ? apiData.rain['1h'] : 0,
			snow: apiData.snow ? apiData.snow['1h'] : 0,
			sunrise: apiData.sys.sunrise,
			sunset: apiData.sys.sunset,
			lattitude: apiData.coord.lat,
			longitude: apiData.coord.lon,
		});

		const newDoc = await newCity.save();
		res.json({ result: true, weather: newDoc });
	} catch (error) {
		res.status(500).json({ result: false, error: 'Internal Server Error' });
	}
});

// get city forecast
router.get('/forecast/:cityName', async (req, res) => {
	const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${req.params.cityName}&appid=${OWM_API_KEY}&units=metric`);
	const apiData = await response.json();
	if (apiData.cod !== '200') {
		res.json({ result: false, error: apiData.message });
		return;
	} else {
		res.json({ result: true, weather: apiData });
	}
});

// Get city by name
router.get("/:cityName", (req, res) => {
	City.findOne({
		cityName: { $regex: new RegExp(req.params.cityName, "i") },
	}).then(data => {
		if (data) {
			res.json({ result: true, weather: data });
		} else {
			res.json({ result: false, error: "City not found" });
		}
	});
});

// Delete city by name
router.delete("/:cityName", (req, res) => {
	City.deleteOne({
		cityName: { $regex: new RegExp(req.params.cityName, "i") },
	}).then(deletedDoc => {
		if (deletedDoc.deletedCount > 0) {
			// document successfully deleted
			City.find().then(data => {
				res.json({ result: true, weather: data });
			});
		} else {
			res.json({ result: false, error: "City not found" });
		}
	});
});

// Update city by name
router.put("/:cityName", (req, res) => {
	City.findOne({
		cityName: { $regex: new RegExp(req.params.cityName, "i") },
	}).then(data => {
		if (data) {
			data.cityName = req.body.cityName;
			data.main = req.body.main;
			data.description = req.body.description;
			data.icon = req.body.icon;
			data.temp = req.body.temp;
			data.feels_like = req.body.feels_like;
			data.tempMin = req.body.tempMin;
			data.tempMax = req.body.tempMax;
			data.humidity = req.body.humidity;
			data.wind = req.body.wind;
			data.clouds = req.body.clouds;
			data.rain = req.body.rain;
			data.snow = req.body.snow;
			data.sunrise = req.body.sunrise;
			data.sunset = req.body.sunset;
			data.lattitude = req.body.lattitude;
			data.longitude = req.body.longitude;

			data.save().then(updatedDoc => {
				res.json({ result: true, weather: updatedDoc });
			});
		} else {
			res.json({ result: false, error: "City not found" });
		}
	});
});

// fetch citynames for autocomplete search bar
router.get('/cityautocomplete', async (req, res) => {
	try {
		const response = await fetch('https://countriesnow.space/api/v0.1/countries');
		const apiData = await response.json();
		const cities = apiData.data.map(country => country.cities).flat();

		res.json({ result: true, cities: cities });
	} catch (error) {
		res.json({ result: false, error: 'Internal Server Error' });
	}
});




module.exports = router;
