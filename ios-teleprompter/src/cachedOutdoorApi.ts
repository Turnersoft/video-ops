import { OutdoorApi } from '@turn/outdoor-ui';
import type { LiveScript, OutdoorScript as UiOutdoorScript, VideoOpsCatalog } from '@turn/outdoor-ui';
import {
  cacheCatalog,
  cacheOutdoorScript,
  getCachedCatalog,
  getCachedOutdoorScript,
  outdoorScriptToLiveFallback,
  prefetchOutdoorScripts,
} from './scriptCache';
import type { OutdoorScript } from './scriptSchema';

export class CachedOutdoorApi extends OutdoorApi {
  private servingFromCache = false;

  isServingFromCache(): boolean {
    return this.servingFromCache;
  }

  async getCatalog(): Promise<VideoOpsCatalog> {
    try {
      const catalog = await super.getCatalog();
      this.servingFromCache = false;
      await cacheCatalog(catalog);
      prefetchOutdoorScripts(this, catalog);
      return catalog;
    } catch (error) {
      const cached = await getCachedCatalog();
      if (cached) {
        this.servingFromCache = true;
        return cached;
      }
      throw error;
    }
  }

  async getOutdoorScript(scriptId: string): Promise<UiOutdoorScript> {
    try {
      const script = await super.getOutdoorScript(scriptId);
      await cacheOutdoorScript(script as OutdoorScript);
      return script;
    } catch (error) {
      const cached = await getCachedOutdoorScript(scriptId);
      if (cached) {
        return cached as UiOutdoorScript;
      }
      throw error;
    }
  }

  async getLiveScript(scriptId: string): Promise<LiveScript> {
    try {
      const live = await super.getLiveScript(scriptId);
      await cacheOutdoorScript({
        schemaVersion: 1,
        id: live.id,
        title: live.title,
        language: live.language,
        mode: live.mode,
        countdownSeconds: live.countdownSeconds,
        slides: live.slides,
      });
      return live;
    } catch {
      const cached = await getCachedOutdoorScript(scriptId);
      if (cached) {
        return outdoorScriptToLiveFallback(cached);
      }
      const outdoor = await this.getOutdoorScript(scriptId);
      return outdoorScriptToLiveFallback(outdoor as OutdoorScript);
    }
  }
}
