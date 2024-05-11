
// Source: https://github.com/samuelmideksa/movv

document.addEventListener('DOMContentLoaded', () => {

    const authToken = getAuthToken();

    if (authToken.length === 0) {
        window.location.replace(window.location.origin + '/tvshow-db/login.php');
    }

    let api = null;

    getApiKey(authToken).then(apiKey => {
        console.log(apiKey);
        const params = {
            //'language': 'fr-FR', 
            'include_adult': false,
        };

        api = new TvShowDB.init(apiKey, params);

        // Some filters can be set before the initial api call.
        // For instance, this will return the tvshows with drama and comedy genre 
        // and released from 1970 to 1977

        api.addGenres([18, 35]);
        //api.setYears([1970, 1977]);

        // Run the initial api call.
        return api.getTvShows();
    }).then(data => {
        buildTvShowList(data, api);

        // Get the genre list from the API then build the genre buttons.
        return api.getGenreList();
    }).then(data => {
        createGenreButtons(data.genres, api.getGenres());
        createYearFilterLists(api);
        createSortTypeOptions(api);
    }).catch(error => {
        console.log('Promise rejected', error.message);
    });

    // Add event listeners to the application elements.

    // Listen to click events coming from inside the tvshow cards.
    document.getElementById('appendData').addEventListener('click', (e) => {
        // Get the actual card div element.
        const clickedCard = e.target.closest('.card-clickable');

        if (clickedCard) {
            // Fetch the tvshow from its id.
            api.getTvShow(clickedCard.dataset.tvshowId).then(data => {
                // Display the tvshow details in a modal window.
                openTvShowModal(data, api);
            }).catch(error => {
                console.log('Promise rejected', error.message);
            });
        }
    });

    // Check for pagination.
    document.getElementById('more').addEventListener('click', (e) => {
        // Set the next page number.
        e.target.dataset.page = parseInt(e.target.dataset.page) + 1;

        // Get the next page of search result.
        if (document.getElementById('searchKey').value.length) {
            api.searchByTitle(document.getElementById('searchKey').value, e.target.dataset.page).then(data => {
                buildTvShowList(data, api);
            }).catch(error => {
                console.log('Promise rejected', error.message);
            });
        }
        // Get the next tvshow page.
        else {
            api.getTvShows(e.target.dataset.page).then(data => {
                buildTvShowList(data, api);
            }).catch(error => {
                console.log('Promise rejected', error.message);
            });
        }
    });

    // Listen to click events from genre buttons.
    document.getElementById('genres').addEventListener('click', (e) => {
        // Make sure the clicked element is a button.
        if (e.target.tagName == 'BUTTON') {
            // Toggle the button selected value
            e.target.dataset.selected = parseInt(e.target.dataset.selected) ? 0 : 1;

            // Set the button appearence accordingly.
            if (parseInt(e.target.dataset.selected)) {
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('btn-primary');
            }
            else {
                e.target.classList.remove('btn-primary');
                e.target.classList.add('btn-secondary');
            }

            if (parseInt(e.target.dataset.selected)) {
                // Add the genre id to the genre filter.
                api.addGenres([parseInt(e.target.dataset.genreId)]);
            }
            else {
                // Remove the genre id from the genre filter.
                api.removeGenres([parseInt(e.target.dataset.genreId)]);
            }

            resetTvShowList(api);
        }
    });

    // Check for reset buttons.
    document.querySelectorAll('.reset-btn').forEach((button) => {
        button.addEventListener('click', (e) => {
            // 
            if (e.target.dataset.resetType == 'genres') {
                api.resetGenres();
                let buttons = document.getElementById('genres').querySelectorAll('button');

                // Set the genre buttons to the unselect state.
                buttons.forEach((button) => {
                    if (parseInt(button.dataset.selected)) {
                        button.dataset.selected = 0;
                        button.classList.remove('btn-primary');
                        button.classList.add('btn-secondary');
                    }
                });
            }

            if (e.target.dataset.resetType == 'years') {
                api.resetYears();

                // Set the drop down lists to their initial state.
                toYear.value = '';
                fromYear.value = '';
                toYear.disabled = true;
            }

            if (e.target.dataset.resetType == 'search') {
                // Reset all the search parameters.
                document.getElementById('searchByTitle').value = '';
                document.getElementById('searchKey').value = '';
                // Display the filters again.
                document.getElementById('filters').style.display = 'block';
            }

            resetTvShowList(api);
        });
    });

    // Checks for change events in the fromYear and toYear drop down lists. 
    document.getElementById('filterByYears').addEventListener('change', (e) => {
        // Get the drop down lists according to the target.
        const fromYear = e.target.id == 'fromYear' ? e.target : document.getElementById('fromYear');
        const toYear = e.target.id == 'toYear' ? e.target : document.getElementById('toYear');

        // The fromYear select value has changed and is not empty. 
        if (e.target.id == 'fromYear' && fromYear.value) {
            toYear.disabled = false;

            if (toYear.value == '' || toYear.value < fromYear.value) {
                // Filter tvshows by single year.
                toYear.value = fromYear.value;
            }

            // Update the toYear options so that the years lower than the one in fromYear can't be selected.
            for (let i = 0; i < toYear.options.length; i++) {
                if (toYear.options[i].value < fromYear.value) {
                    toYear.options[i].disabled = true;
                }
                else {
                    toYear.options[i].disabled = false;
                }
            }

            api.setYears([fromYear.value, toYear.value]);
        }

        // The fromYear select value has changed and is empty (ie: the default 'Select a year' option). 
        if (e.target.id == 'fromYear' && !fromYear.value) {
            // Set the toYear drop down list to its initial state.
            toYear.value = fromYear.value;
            toYear.disabled = true;

            api.resetYears();
        }

        // The toYear select value has changed.
        if (e.target.id == 'toYear') {
            api.setYears([fromYear.value, toYear.value]);
        }

        resetTvShowList(api);
    });

    // Check for the change of sort type.
    document.getElementById('sortBy').addEventListener('change', (e) => {
        api.setSortBy(e.target.value);
        resetTvShowList(api);
    });

    // Check for the search by title.
    document.getElementById('searchByTitle').addEventListener('keydown', (e) => {
        let searchKey = e.target.value;

        // The Enter key has been pressed. 
        if (e.keyCode == 13) {
            // Remove all the tvshows from the list.
            document.getElementById('appendData').innerHTML = '';

            // Run the search.
            api.searchByTitle(searchKey).then(data => {
                // Set the hidden input search key.
                document.getElementById('searchKey').value = searchKey;
                buildTvShowList(data, api);
                // Hide the filters as they are not taken into account when seaching.
                document.getElementById('filters').style.display = 'none';
            }).catch(error => {
                console.log('Promise rejected', error.message);
            });
        }
    });
});


function getAuthToken() {
    const name = 'auth_token';
    // Retrieve the authentication token from the session cookie
    return document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '';
}

async function getApiKey(authToken) {
    // Make a request to your PHP endpoint with the authentication token
    const response = await fetch(window.location.origin + '/tvshow-db/backend/data.php', {
                               method: 'GET',
                               headers: {
                                   'Authorization': `Bearer ${authToken}`
                               }
                           });

    // Throw an error in case the response status is different from 200 (ie: OK).
    if (response.status !== 200) {
        throw new Error('Couldn\'t fetch the data. status: ' + response.status);
    }

    const apiKey = await response.text();

    return apiKey;
}

function resetTvShowList(api) {
    // Remove all the tvshows from the list.
    document.getElementById('appendData').innerHTML = '';

    // Get the tvshows.
    api.getTvShows().then(data => {
        buildTvShowList(data, api);
    }).catch(error => {
        console.log('Promise rejected', error.message);
    });
}

function createGenreButtons(genres, selected) {
    // Loop through the genre list.
    genres.forEach((genre) => {
        // First create a column container for the button.
        let column = document.createElement('div');
        column.className = 'col-md-2 mb-2';

        // Check if genre is already selected.
        const isSelected = selected.includes(genre.id) ? 1 : 0;

        // Create the genre button.

        let button = document.createElement('button');
        // Set the button class accordingly.
        const btnStyle = isSelected ? 'primary' : 'secondary';
        button.className = 'btn btn-' + btnStyle + ' btn-genre';
        button.setAttribute('id', genre.id);
        button.setAttribute('type', 'button');
        button.setAttribute('data-genre-id', genre.id);
        button.setAttribute('data-selected', isSelected);
        const buttonName = document.createTextNode(genre.name);
        button.appendChild(buttonName);

        // Append the button to its container.
        column.appendChild(button);
        // Append the column button to the genre container.
        document.getElementById('genres').appendChild(column);
    });
}

function createYearFilterLists(api) {
    // Create the fromYear and toYear drop down lists.
    let fromYear = document.createElement('select');
    fromYear.className = 'form-select';
    fromYear.setAttribute('name', 'fromYear');
    fromYear.setAttribute('id', 'fromYear');

    let toYear = document.createElement('select');
    toYear.className = 'form-select';
    toYear.setAttribute('name', 'toYear');
    toYear.setAttribute('id', 'toYear');
    // The toYear select list is always disabled at first.
    toYear.setAttribute('disabled', true);

    // Build the first option.
    let option = document.createElement('option');
    option.value = '';
    option.text = 'Select a year';

    // Append the option to both drop down lists.
    fromYear.appendChild(option);
    toYear.appendChild(option.cloneNode(true));

    const years = api.getYearList();
    const selected = api.getYears();

    // Loop through the year list.
    years.forEach((year) => {
        option = document.createElement('option');
        option.value = year;
        option.text = year;

        // Clone the created option to append it to the second drop down list (toYear).
        let clone = option.cloneNode(true);

        // Check if the year has been selected.
        if (selected.length && selected[0] == year) {
            option.setAttribute('selected', true);
        }

        fromYear.appendChild(option);

        // Check if the year has been selected.
        if (selected.length && selected[1] == year) {
            clone.setAttribute('selected', true);
            toYear.disabled = false;
        }

        toYear.appendChild(clone);
    });

    document.getElementById('fromYearList').appendChild(fromYear);
    document.getElementById('toYearList').appendChild(toYear);
}

function buildTvShowList(data, api) {

        console.log(data);
    data.results.forEach((value, index, array) => {
        // Create the tvshow card.
        let card = document.createElement('div');
        card.className = 'card card-clickable col-lg-3 col-md-4 col-sm-6 my-3 mx-auto';
        card.style.width = '13rem';
        card.style.padding = '0';
        // To store the tvshow id.
        card.setAttribute('data-tvshow-id', value.id); 

        let cardImage = document.createElement('img');
        cardImage.className = 'card-img-top img-fluid';
        let posterUrl = `${api.getBaseImageUrl('w500')}${value.poster_path}`;
        cardImage.setAttribute('src', posterUrl);
        cardImage.style.height = 'auto';
        cardImage.style.width = '100%';

        let cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        let cardTitle = document.createElement('h5');
        cardTitle.className = 'card-title fw-bold';
        cardTitle.textContent = value.original_name;

        let cardText = document.createElement('p');
        cardText.className = 'card-text fs-6 mb-1';
        cardText.textContent = value.first_air_date;

        let cardVote = document.createElement('p');
        cardVote.className = 'card-text fs-6';
        cardVote.textContent = 'Vote: ' + value.vote_average.toFixed(1);

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(cardVote);
        card.appendChild(cardImage);
        card.appendChild(cardBody);
        document.getElementById('appendData').appendChild(card);
    });

    if (document.getElementById('appendData').childNodes.length == 0 || document.getElementById('appendData').childNodes.length < 20 || data.results.length == 0) {
        // Hide the "More" button if the list is empty or has less than 20 tvshows or the given data is empty.
        document.getElementById('more').style.display = 'none';
    }
    else {
        document.getElementById('more').style.display = 'block';
    }
}

function createSortTypeOptions(api) {
    const sortTypes = api.getSortTypes();
    const sortBy = document.getElementById('sortBy');

    sortTypes.forEach((sortType) => {
        option = document.createElement('option');
        option.value = sortType.value;
        option.text = sortType.text;

        if (sortType.value == api.getSortBy()) {
            option.setAttribute('selected', true);
        }

        sortBy.appendChild(option);
    });

}

// Function to open the modal and populate it with tvshow details
function openTvShowModal(tvshow, api) {
  console.log(tvshow);
    const modalTitle = document.getElementById('tvshowModalLabel');
    const modalPoster = document.getElementById('modalPoster');
    const modalReleaseDate = document.getElementById('modalReleaseDate');
    const modalRuntime = document.getElementById('modalRuntime');
    const modalOverview = document.getElementById('modalOverview');
    const modalCreatedBy = document.getElementById('modalCreatedBy');
    const modalCasting = document.getElementById('modalCasting');
    const modalVoteAverage = document.getElementById('modalVoteAverage');

    // Get the casting (the 4 first actors) and the director name.

    let casting = '';

    for (let i = 0; i < tvshow.credits.cast.length; i++) {
        casting = casting + tvshow.credits.cast[i].name;

        if (i < 3) {
            casting = casting + ', ';
        }
        else {
            casting = casting + '...';
            break;
        }
    }

    // Populate modal
    modalTitle.textContent = `${tvshow.name} (${new Date(tvshow.first_air_date).getFullYear()})`;
    modalPoster.src = `${api.getBaseImageUrl('w500')}${tvshow.poster_path}`;
    modalReleaseDate.textContent = tvshow.first_air_date;
    // Compute the run time according to the given array value.
    const runtime = tvshow.episode_run_time.length ? `${Math.floor(tvshow.episode_run_time[0] / 60)}h ${tvshow.episode_run_time[0] % 60}min` : 'No info';
    modalRuntime.textContent = runtime;
    modalSeasons.textContent = tvshow.number_of_seasons
    modalInProduction.textContent = tvshow.in_production ? 'Yes' : 'No';
    modalOverview.textContent = tvshow.overview;
    modalCreatedBy.textContent = tvshow.created_by[0].name;
    modalCasting.textContent = casting;
    modalVoteAverage.textContent = tvshow.vote_average.toFixed(1);

    // Open the modal
    const tvshowModal = new bootstrap.Modal(document.getElementById('tvshowModal'));
    tvshowModal.show();
}

