import logging
import handlers
from errors import Shutdown


def shutdown():
    raise Shutdown()


class WarmupHandler(handlers.BaseRequestHandler):
    def get(self):
        logging.info("Warmup Request")


class StartInstance(handlers.BaseRequestHandler):
    def get(self):
        logging.info("Instance start request")
        from google.appengine.api import runtime
        runtime.set_shutdown_hook(shutdown)

