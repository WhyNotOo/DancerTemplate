(function () {

  var
    options           = Joshfire.factory.config.template.options || {},
    songs             = Joshfire.factory.getDataSource("songs"),
    AUDIO_FILES       = new Object(),
    PARTICLE_COUNT    = options.particules,
    MAX_PARTICLE_SIZE = 12,
    MIN_PARTICLE_SIZE = 2,
    GROWTH_RATE       = 5,
    DECAY_RATE        = 1,

    BEAM_RATE         = 0.5,
    BEAM_COUNT        = 20,

    GROWTH_VECTOR = new THREE.Vector3( GROWTH_RATE, GROWTH_RATE, GROWTH_RATE ),
    DECAY_VECTOR  = new THREE.Vector3( DECAY_RATE, DECAY_RATE, DECAY_RATE ),
    beamGroup     = new THREE.Object3D(),
    particles     = group.children,
    colors        = [ 0xaaee22, 0x04dbe5, 0xff0077, 0xffb412, 0xf6c83d ],
    t, dancer, beat;

  Dancer.setOptions({
    flashSWF : 'js/vendors/soundmanager2.swf',
    flashJS  : 'js/vendors/soundmanager2.js'
  });


  function on () {
    for ( var i = PARTICLE_COUNT; i--; ) {
      particle = new THREE.Particle( newParticleMat() );
      particle.position.x = Math.random() * 2000 - 1000;
      particle.position.y = Math.random() * 2000 - 1000;
      particle.position.z = Math.random() * 2000 - 1000;
      particle.scale.x = particle.scale.y = Math.random() * 10 + 5;
      group.add( particle );
    }
    scene.add( group );

    var
      beamGeometry = new THREE.PlaneGeometry( 5000, 50, 1, 1 ),
      beamMaterial, beam,
      playlist = document.getElementById('list').childNodes;

    for ( i = BEAM_COUNT; i--; ) {
      beamMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        color: colors[ ~~( Math.random() * 5 )]
      });
      beam = new THREE.Mesh( beamGeometry, beamMaterial );
      beam.doubleSided = true;
      beam.rotation.x = Math.random() * Math.PI;
      beam.rotation.y = Math.random() * Math.PI;
      beam.rotation.z = Math.random() * Math.PI;
      beamGroup.add( beam );
    }

    /*
     * Joshfire Get songs
     */

    songs.find({ limit: 20 }, function (err, data) {
      if(err) {
        console.log('erreur : '+err);
      } else {
        for (var i = 0, len = data.entries[0].entries.length; i < len; i++) {
          var song = 'song'+i;
          AUDIO_FILES[song] = {
            'name'  : data.entries[0].entries[i].name,
            'url'   : data.entries[0].entries[i].audio.contentURL
          }
          AUDIO_FILES['length'] = i;
        }
        makePlaylist();
        createSong('song0');
      }
    });

    for (var i = 0, len = playlist.length; i < len; i++) {
      playlist[i].addEventListener( 'click', function (e) {
        e.preventDefault();
        dancer.stop();
        beat.off();

        document.getElementById('loader').style.display = 'block';

        var song = e.target.dataset.song;
        createSong(song);
      }, false );
    }
  }

  function decay () {
    if ( beamGroup.children[ 0 ].visible ) {
      for ( i = BEAM_COUNT; i--; ) {
        beamGroup.children[ i ].visible = false;
      }
    }

    for ( var i = PARTICLE_COUNT; i--; ) {
      if ( particles[i].scale.x - DECAY_RATE > MIN_PARTICLE_SIZE ) {
        particles[ i ].scale.subSelf( DECAY_VECTOR );
      }
    }
  }

  function changeParticleMat ( color ) {
    var mat = newParticleMat( color );
    for ( var i = PARTICLE_COUNT; i--; ) {
      if ( !color ) {
        mat = newParticleMat();
      }
      particles[ i ].material = mat;
    }
  }

  function newParticleMat( color ) {
    var
      sprites = [ 'pink', 'orange', 'yellow', 'blue', 'green' ],
      //sprites = ['1', '2', '3'],
      sprite = color || sprites[ ~~( Math.random() * 5 )];

    return new THREE.ParticleBasicMaterial({
      blending: THREE.AdditiveBlending,
      size: MIN_PARTICLE_SIZE,
      map: THREE.ImageUtils.loadTexture('img/particle_' + sprite + '.png'),
      // map: THREE.ImageUtils.loadTexture('img/animal_' + sprite + '.gif'),
      vertexColor: 0xFFFFFF
    });
  }

  function createSong (song) {
    dancer = '';
    dancer = new Dancer( AUDIO_FILES[song].url );

    beat = dancer.createBeat({
      onBeat: function () {
        var i;
        if ( particles[ 0 ].scale.x > MAX_PARTICLE_SIZE ) {
          decay();
        } else {
          for ( i = PARTICLE_COUNT; i--; ) {
            particles[ i ].scale.addSelf( GROWTH_VECTOR );
          }
        }
        if ( !beamGroup.children[ 0 ].visible ) {
          for ( i = BEAM_COUNT; i--; ) {
            beamGroup.children[ i ].visible = true;
          }
        }
      },
      offBeat: decay
    });

    dancer.onceAt( 0, function () {
      beat.on();
    }).onceAt( 8.2, function () {
      scene.add( beamGroup );
    }).after( 8.2, function () {
      beamGroup.rotation.x += BEAM_RATE;
      beamGroup.rotation.y += BEAM_RATE;
    }).fft( document.getElementById( 'fft' ) );
    // .onceAt( 50, function () {
    //   changeParticleMat( 'white' );
    // }).onceAt( 66.5, function () {
    //   changeParticleMat( 'pink' );
    // }).onceAt( 75, function () {
    //   changeParticleMat();
    // }).fft( document.getElementById( 'fft' ) );

    if(Dancer.isSupported())
      !dancer.isLoaded() ? dancer.bind( 'loaded', loadSong ) : loadSong(song);
  }

  function makePlaylist () {
    for (var i = 0, len = AUDIO_FILES['length']; i < len; i++) {
      var song = document.createElement('li'),
          playlist = document.getElementById('list'),
          songID = 'song'+i;
      song.innerHTML = '<a href="#" title="'+AUDIO_FILES[songID].name+'" data-song="'+songID+'">'+AUDIO_FILES[songID].name+'</a>';
      playlist.appendChild(song);
    }
  }

  function loadSong (song) {
    var
      loading = document.getElementById( 'loader' ),
      anchor  = document.createElement('A'),
      supported = Dancer.isSupported(),
      p;

    anchor.setAttribute( 'href', '#' );
    loading.childNodes[1].appendChild( anchor );

    if ( !supported ) {
      alert( 'Your browser does not currently support either Web Audio API or Audio Data API. The audio may play, but the visualizers will not move to the music; check out the latest Chrome or Firefox browsers!' );
    }

    document.getElementById('songname').innerHTML = AUDIO_FILES[song];
    document.getElementById('loader').style.display = 'none';
    dancer.play();
  }

  on();

  // For debugging
  window.dancer = dancer;

})();