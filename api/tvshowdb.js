
// Anonymous function with namespace.
const TvShowDB = (function() {

    // The private key that gives access to the storage for private properties.
    const _key = {};

    const _private = function() {
        // The storage object for private properties.
        const privateProperties = {};

        return function(key) {
            // Compare the given key against the actual private key.
            if (key === _key) {
                return privateProperties;
            }

            // If the user of the class tries to access private
            // properties, they won't have the access to the `key`
            console.error('Cannot access private properties');
            return undefined;
        };
    };

    // Private functions.

    // Generic function to get data from a given resource.
    async function _getData(resource, responseType) {
        // Wait until the response promise returned by fetch is completed.
        const response = await fetch(resource);

        // Throw an error in case the response status is different from 200 (ie: OK).
        if (response.status !== 200) {
            throw new Error('Couldn\'t fetch the data. status: ' + response.status);
        }

        const type = responseType === undefined ? 'json' : responseType;
        // Wait until the promise returned by the response object is completed.
        const data = await response[type]();

        return data;
    }

    function _initProperties(_) {
        _(_key).params = {};
        _(_key).apiBaseUrl = 'https://api.themoviedb.org/3/';
        _(_key).baseImageUrl = 'https://image.tmdb.org/t/p/';
        _(_key).filters = { 'genres': [], 'years': [], 'casts': [] };
        _(_key).sortBy = '';
        _(_key).sortTypes = [
            {'value': 'name.asc', 'text': 'Original title asc'},
            {'value': 'name.desc', 'text': 'Original title desc'},
            {'value': 'popularity.asc', 'text': 'Popularity asc'},
            {'value': 'popularity.desc', 'text': 'Popularity desc'},
            {'value': 'first_air_date.asc', 'text': 'First air date asc'},
            {'value': 'first_air_date.desc', 'text': 'First air date desc'},
            {'value': 'vote_average.asc', 'text': 'Vote average asc'},
            {'value': 'vote_average.desc', 'text': 'Vote average desc'},
            {'value': 'vote_count.asc', 'text': 'Vote count asc'},
            {'value': 'vote_count.desc', 'text': 'Vote count desc'},
        ];

    }

    /*
     * Initializes the instance with the given parameters.
     * Sets it to a default value when no parameter is given.
     */
    function _initParams(_, params) {
        _(_key).params.language = params.language === undefined ? 'en-US' : params.language;
        _(_key).params.include_adult = params.include_adult === undefined ? false : params.include_adult;
        _(_key).params.include_video = params.include_video === undefined ? false : params.include_video;
        _(_key).params.sort_by = params.sort_by === undefined ? 'popularity.desc' : params.sort_by;

    }

    // Function used as a class constructor.
    const _TvShowDB = function(apiKey, params) {
        // Creates a private object
        this._ = _private(); 

        this._(_key).apiKey = apiKey;
        // Initialize both private properties and parameters.
        _initProperties(this._);
        params = params === undefined ? {} : params;
        _initParams(this._, params);

        // Set the sortBy property. 
        this._(_key).sortBy = this._(_key).params.sort_by;
    };
    
    // Public functions.

    _TvShowDB.prototype = {

        getTvShows: async function(page) {
            // Set the page to display.
            page = page === undefined ? 1 : page;
            // Set the filters.
            const with_genres = this._(_key).filters.genres.length ? '&with_genres=' + this._(_key).filters.genres.join(',') : '';
            const first_air_date = this._(_key).filters.years.length ? '&first_air_date.gte=' + this._(_key).filters.years[0] + '-01-01&first_air_date.lte=' + this._(_key).filters.years[1] + '-12-31' : '';

            // Build the resource.
            const resource = this._(_key).apiBaseUrl + 'discover/tv?api_key=' +
                             this._(_key).apiKey +
                             '&include_adult=' + this._(_key).params.include_adult + 
                             '&include_video=' + this._(_key).params.include_video + 
                             '&language=' + this._(_key).params.language +
                             with_genres + 
                             '&sort_by=' + this._(_key).sortBy + 
                             first_air_date + 
                             '&page=' + page;

            const data = await _getData(resource);

            return data;
        },

        getTvShow: async function(id) {
            const resource = this._(_key).apiBaseUrl + 'tv/' + id + '?api_key=' + this._(_key).apiKey +
                            '&append_to_response=credits' + // cast + crew 
                            '&language=' + this._(_key).params.language;

            const data = await _getData(resource);

            return data;
        },

        getGenreList: async function() {
            const resource = this._(_key).apiBaseUrl + 'genre/tv/list?api_key=' +
                             this._(_key).apiKey +
                             '&language=' + this._(_key).params.language;

            const data = await _getData(resource);

            return data;
        },

        getGenres: function() {
            return this._(_key).filters.genres;
        },

        addGenres: function(ids) {
            for (let i = 0; i < ids.length; i++) {
                this._(_key).filters.genres.push(ids[i]);
            }
        },

        removeGenres: function(ids) {
            for (let i = 0; i < ids.length; i++) {
                this._(_key).filters.genres = this._(_key).filters.genres.filter(id => id !== ids[i]);
            }
        },

        resetGenres: function() {
            this._(_key).filters.genres = [];
        },

        getYearList: function() {
            let years = [];
            let year = 1940;
            const currentYear = new Date().getFullYear();

            while (year < currentYear + 1) {
                years.push(year);
                year++;
            }

            return years;
        },

        setYears: function(years) {
            // Make sure the given parameter is valid.
            if (!Array.isArray(years) || years.length != 2) {
                console.log('Error: years parameter must be of type Array and must contained 2 elements.')
                return;
            }

            this._(_key).filters.years = years;
        },

        getYears: function() {
            return this._(_key).filters.years;
        },

        resetYears: function() {
            this._(_key).filters.years = [];
        },

        getBaseImageUrl: function(size) {
            size = size === undefined ? '' : size;
            return this._(_key).baseImageUrl + size;
        },

        getSortTypes: function() {
            return this._(_key).sortTypes;
        },

        getSortBy: function() {
            return this._(_key).sortBy;
        },

        setSortBy: function(sortType) {
            return this._(_key).sortBy = sortType;
        },

        searchByTitle: async function(title, page) {
            page = page === undefined ? 1 : page;

            const resource = this._(_key).apiBaseUrl + 'search/tv?api_key=' +
                             this._(_key).apiKey + 
                             '&query=' + title +
                             '&page=' + page;

            const data = await _getData(resource);
            return data;
        },
    };

    // Returns a init property that returns the "constructor" function.
    return {
        init: _TvShowDB
    }

})();
