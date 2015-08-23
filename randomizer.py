#!/usr/bin/env python

import sys
import json
import math
import numpy
import base64
import random

def clamp(num, low, high):
    if num < low:
        return low
    elif num > high:
        return high
    else:
        return num

if __name__ == "__main__":
    in_path, fuzz, magnitude = sys.argv[1:]
    jta = json.load(open(in_path, "r"))
    blob = jta['attributes'][0]['vertices']['position']['data']
    data = numpy.fromstring(base64.b64decode(blob), numpy.float16)
    
    slots = range(len(data))
    random.shuffle(slots)
    fuzz = clamp(fuzz, 0, 100)/100.0
    cut = math.floor(len(data) * fuzz)
    for i in slots:
        if i > cut:
            break
        else:
            data[i] = data[i] + ((random.random()*float(magnitude))-(float(magnitude)/2.0))
    rencoded = base64.b64encode(data.tostring()).decode("ascii")
    jta['attributes'][0]['vertices']['position']['data'] = rencoded

    out_path = ".".join(in_path.split(".")[:-1] + ["fuzzy", "jta"])
    json.dump(jta, open(out_path, "w"))
