#!/bin/bash

cd /home/outils
rm screenlog.0
screen -dmSL copbotoutils node app findDrop
exit