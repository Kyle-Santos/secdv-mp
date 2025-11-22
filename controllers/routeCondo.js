const session = require('express-session');
const condoModel = require('../models/Condo');
const reviewModel = require('../models/Review');
const userFunctions = require('../models/userFunctions');


function add(server){
    server.post('/filter-condo', function(req, resp){
        var rating = req.body.rating;
        var searchQuery = {rating: {$gte: rating}};
        var listOfCondos = new Array();

        condoModel.find(searchQuery).then(function(condos){
            for(const item of condos){
                item.description = item.description.slice(0, 150) + "...";
                listOfCondos.push(item);
            }

            resp.send({condos: listOfCondos});
        });
    });

    server.post('/search-condo', function(req, resp){
        var text = req.body.text;
        var listOfCondos = new Array();
        

        condoModel.find().then(function(condos){
            let condoName;
            let condoText;
            let condoAddress;
            for(const item of condos){
                condoName = item.name.toUpperCase();
                condoText = item.description.toUpperCase();
                condoAddress = item.address.toUpperCase();

                if(condoName.includes(text) || condoText.includes(text) || condoAddress.includes(text)){
                    item.description = item.description.slice(0, 150) + "...";
                    listOfCondos.push(item);
                }
                
            }

            resp.send({condos: listOfCondos});
        });

        
    });
  
    // get condo from the db GET
    server.get('/condo/:condoId', async (req, resp) => {
        const condoId = req.params.condoId; // Retrieve the condo ID from the URL
        const formattedCondoId = condoId.replace('-', ' ').toUpperCase(); // Format the condo ID

        try {
            // Query MongoDB to get data
            var data = await condoModel.findOne({ id: condoId }).lean();
            var processedReviews;
            
            // Find all reviews for the specified condo
            const reviews = await reviewModel.find({ condoId: condoId }).populate('author comments.user').lean();

            processedReviews = await userFunctions.processReviews(reviews, req.session._id);

            resp.render('condo', {
                layout: 'index',
                title: formattedCondoId,
                session: req.session,
                'data': data,
                'reviews': processedReviews.reverse(),
                isCondo: true
            });
        } catch (err) {
            // Handle errors
            console.error('Error fetching data from MongoDB', err);
            resp.status(500).json({ error: 'Failed to fetch data' });
        }
    });    

    server.get('/condo/:condoId/edit', async (req, res) => {
        const condoId = req.params.condoId;

        try {
            const condo = await condoModel.findOne({ id: condoId }).lean();

            // Only owner can access
            if (!condo || condo.owner.toString() !== (req.session._id).toString()) {
                return res.status(403).send('Unauthorized');
            }

            res.render('edit-condo', { layout: 'index', data: condo, isEditCondo: true, title: `Edit ${condo.name}` });
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    });

    server.post('/condo/:condoId/edit', async (req, res) => {
        const condoId = req.params.condoId;

        try {
            const condo = await condoModel.findOne({ id: condoId });

            // Only owner can edit
            if (!condo || condo.owner.toString() !== (req.session._id).toString()) {
                return res.status(403).send('Unauthorized');
            }

            // Update fields
            condo.name = req.body.name || condo.name;
            condo.address = req.body.address || condo.address;
            condo.description = req.body.description || condo.description;

            await condo.save();

            // If using AJAX, respond with JSON
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ condoId: condoId });
            }
            
            res.redirect(`/condo/${condoId}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('Failed to update condo');
        }
    });

}

module.exports.add = add;