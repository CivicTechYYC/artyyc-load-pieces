const admin = require('firebase-admin');
const axios = require('axios');
const _ = require('lodash');


const config = {
  cityOfCalgaryDataPath: 'https://data.calgary.ca/resource/t27m-7yj8.json',
  esriDataPath: 'https://services1.arcgis.com/AVP60cs0Q9PEA8rH/arcgis/rest/services/Calgary_PublicArt_PublicView/FeatureServer/0/query?f=json&where=1%3D1&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=102100&resultOffset=0&resultRecordCount=1000',
  db: null,
}


const connectToFirebase = () => {
	const serviceAccount = require('../serviceAccountKey.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://artyyc-e474d.firebaseio.com"
  });

  config.db = admin.firestore();
}

const insertPiece = (piece) => {
  return config.db.collection('pieces').add(piece);
};

const loadPiecesFromCalgaryData = () => {
  return axios.get(config.cityOfCalgaryDataPath).then(d => d.data);
}

const loadEsriCityData = () => {
  return axios.get(config.esriDataPath).then(d => d.data);
}

const findImagePath = (piece, esriCityData) => {
  return new Promise((resolve, reject) => {
    const { art_id } = piece;

    // Find the doc in the image data
    const imageDocObject = _.find(esriCityData.features, imageDoc => imageDoc.attributes.ART_ID === art_id);
    // Update our doc with the image doc URL
    if (imageDocObject) {
      piece.imageSource = imageDocObject.attributes.PIC_URL;
    }

    resolve(piece);
  });

}

const loadPieces = async () => {
  connectToFirebase();

  const cityPieceData = await loadPiecesFromCalgaryData();
  
  const esriCityData = await loadEsriCityData();
  console.log("esriCityData", esriCityData);


  await Promise.all(
    cityPieceData.map(piece => findImagePath(piece, esriCityData).then(insertPiece))
  );
}

loadPieces()