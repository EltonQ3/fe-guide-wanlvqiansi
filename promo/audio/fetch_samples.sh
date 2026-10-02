#!/bin/sh
# Fetch the samples the scores use, both CC0 1.0 from Versilian Studios: VSCO 2 Community Edition (orchestra) and the
# Versilian Community Sample Library (piano, organ, drums, bells, anvil). Only the folders listed below are checked
# out (about 2.5 GB) into promo/samples/, which git ignores.
set -e
cd "$(dirname "$0")/.."
DIR=samples/vsco-2-ce
if [ ! -d "$DIR/.git" ]; then
  mkdir -p samples
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout https://github.com/sgossner/VSCO-2-CE "$DIR"
fi
cd "$DIR"
git sparse-checkout init --no-cone
cat > .git/info/sparse-checkout <<'LIST'
/LICENSE*
/Strings/Harp/
/Strings/Violin Section/susVib/
/Strings/Violin Section/Spic/
/Strings/Violin Section/Trem/
/Strings/Viola Section/susvib/
/Strings/Viola Section/spic/
/Strings/Cello Section/susvib/
/Strings/Cello Section/spic/
/Strings/Cello Section/trem/
/Strings/Solo Contrabass/SusVib/
/Strings/Solo Contrabass/Spic/
/Strings/Solo Violin/Arco Vib/
/Woodwinds/Flute/expvib/
/Woodwinds/Flute/susvib/
/Woodwinds/Flute/stac/
/Brass/F Horn/sus/
/Brass/F Horn/stac/
/Brass/Trumpet/sus/
/Brass/Trumpet/susvib/
/Brass/Tenor Trombone/sus/
/Brass/Tuba/sus/
/Percussion/Timpani/
/Percussion/Glock/
/Percussion/BDrumNewhit*
/Percussion/susCymb1-cresc*
/Percussion/susCymb1-hit_*
/Percussion/cymbal-crash1*
/Percussion/gongHit*
/Percussion/Claves*
/Percussion/LogDrum*
/Percussion/Snare2-roll*
/Percussion/Anvil*
LIST
git checkout -q HEAD
cd ../..
DIR=samples/vcsl
if [ ! -d "$DIR/.git" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout https://github.com/sgossner/VCSL "$DIR"
fi
cd "$DIR"
git sparse-checkout init --no-cone
cat > .git/info/sparse-checkout <<'LIST'
/LICENSE*
/Chordophones/Zithers/Grand Piano, Steinway B/**/JHPiano_Sus_Close_*
/Aerophones/Edge-blown Aerophones/Pipe Organ/
/Membranophones/Struck Membranophones/Bass Drum 2/
/Membranophones/Struck Membranophones/Tom 1/
/Membranophones/Struck Membranophones/Tom 2/
/Membranophones/Struck Membranophones/Frame Drum/
/Membranophones/Struck Membranophones/Snare Drum, Modern 1/
/Idiophones/Struck Idiophones/Tubular Bells 1/
/Idiophones/Struck Idiophones/Anvil/
/Idiophones/Struck Idiophones/Clash Cymbals 1/
/Idiophones/Struck Idiophones/Suspended Cymbal 2/
LIST
git checkout -q HEAD
echo "samples ready in samples/vsco-2-ce and samples/vcsl"
