package com.mobileapp;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * ReactPackage that registers UsageStatsModule with React Native.
 *
 * This package is manually added in MainApplication.kt because it
 * is a project-local native module (not an auto-linked npm package).
 */
public class UsageStatsPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(
        @NonNull ReactApplicationContext reactContext
    ) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new UsageStatsModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(
        @NonNull ReactApplicationContext reactContext
    ) {
        return Collections.emptyList();
    }
}
