#!/bin/sh
# Fetch the orchestral samples the long score uses: VSCO 2 Community Edition (Versilian Studios, CC0 1.0).
# Only the folders listed below are checked out (about 1.9 GB) into promo/samples/vsco-2-ce, which git ignores.
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
LIST
git checkout -q HEAD
echo "samples ready in $DIR"
