class ServiceContainer {
  constructor() {
    this.services = {};
    this.instances = {};
    this.resolvers = {};
  }

  register(name, service, dependencies = []) {
    this.services[name] = { service, dependencies };
  }

  registerResolver(name, resolver) {
    this.resolvers[name] = resolver;
  }

  async get(name) {
    if (this.instances[name]) {
      return this.instances[name];
    }

    if (this.resolvers[name]) {
      return await this.resolvers[name]();
    }

    const targetService = this.services[name];
    if (!targetService) {
      throw new Error(`Service ${name} not found`);
    }

    const { service, dependencies } = targetService;
    let resolvedDependencies = [];
    for (const dep of dependencies) {
      resolvedDependencies.push(await this.get(dep));
    }

    let instance;
    if (typeof service === "function" && service.prototype) {
      instance = new service(...resolvedDependencies);
    } else if (typeof service === "function") {
      instance = service(...resolvedDependencies);
    } else {
      instance = service;
    }

    this.instances[name] = instance;
    return instance;
  }
}

export default ServiceContainer;
