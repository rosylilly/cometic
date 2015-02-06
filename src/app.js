var ACCEPTED_EXTS = ['jpg', 'gif', 'png', 'bmp', 'webp'];
var path = require('path');
var zip = require('zip');

Zepto(function($) {
  window.App = new Vue({
    el: '#app',
    data: {
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
        dppx: window.devicePixelRatio
      },
      book: {
        path: null,
        title: null,
        pages: []
      }
    },
    computed: {
      actualWidth: function() {
        return Math.floor(this.window.width * this.window.dppx);
      },
      actualHeight: function() {
        return Math.floor(this.window.height * this.window.dppx);
      },
      title: function() {
        if(this.book.title) {
          return this.book.title + ' - Cometic';
        } else {
          return 'Cometic';
        }
      }
    },
    methods: {
      onDragover: function(e) {
        e.preventDefault();

        return false;
      },

      onDragleave: function(e) {
        e.preventDefault();

        return false;
      },

      onDrop: function(e) {
        e.preventDefault();

        if(e.dataTransfer.files.length > 0) {
          this.getBook(e.dataTransfer.files[0]);
        }

        return false;
      },

      openFile: function() {
        this.fileSelector.click();
      },

      selectFile: function(e) {
        var file = App.fileSelector[0].files[0];
        this.getBook(file);

        App.fileSelector.reset();
      },

      getBook: function(file) {
        this.book.path = file.path;
        this.book.title = path.basename(file.path, path.extname(file.path));
        this.book.pages = [];

        var reader = new FileReader();
        var app = this;
        reader.onload = function(e) {
          var zipReader = zip.Reader(new Buffer(e.target.result, 'binary'));
          zipReader.forEach(function(entry) {
            if(entry.isDirectory()) {
              return;
            }

            var fileName = entry.getName();
            var ext = path.extname(fileName).toLowerCase().substr(1);

            if(ACCEPTED_EXTS.indexOf(ext) == -1) {
              return;
            }

            var base64 = entry.getData().toString('base64');

            app.book.pages.push({
              name: fileName,
              ext: ext,
              data: base64
            });
          });
        };
        reader.readAsBinaryString(file);
      }
    }
  });

  App.fileSelector = $('#file-selector');

  $(window).on('resize', function(e) {
    App.window.width = window.innerWidth;
    App.window.height = window.innerHeight;
  });
  $(window).on('dragover drop', function(e) {
    e.preventDefault();
    return false;
  });
});
