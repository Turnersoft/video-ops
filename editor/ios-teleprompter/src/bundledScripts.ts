import type { OutdoorScript } from './scriptSchema';

import setsV201Set from '../assets/scripts/01-set.json';
import setsV202Subset from '../assets/scripts/02-subset.json';
import setsV203ProperSubset from '../assets/scripts/03-proper-subset.json';
import setsV204SetEquality from '../assets/scripts/04-set-equality.json';
import setsV205EmptySet from '../assets/scripts/05-empty-set.json';
import setsV206EmptySubsetTheorem from '../assets/scripts/06-empty-subset-theorem.json';
import setsV207Union from '../assets/scripts/07-union.json';
import setsV208Intersection from '../assets/scripts/08-intersection.json';
import setsV209Disjoint from '../assets/scripts/09-disjoint.json';
import setsV210Complement from '../assets/scripts/10-complement.json';
import setsV211Difference from '../assets/scripts/11-difference.json';
import setsV212UnionIdempotent from '../assets/scripts/12-union-idempotent.json';

export const BUNDLED_SCRIPTS: OutdoorScript[] = [
  setsV201Set as OutdoorScript,
  setsV202Subset as OutdoorScript,
  setsV203ProperSubset as OutdoorScript,
  setsV204SetEquality as OutdoorScript,
  setsV205EmptySet as OutdoorScript,
  setsV206EmptySubsetTheorem as OutdoorScript,
  setsV207Union as OutdoorScript,
  setsV208Intersection as OutdoorScript,
  setsV209Disjoint as OutdoorScript,
  setsV210Complement as OutdoorScript,
  setsV211Difference as OutdoorScript,
  setsV212UnionIdempotent as OutdoorScript,
];
