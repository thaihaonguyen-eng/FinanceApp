import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, Image, Dimensions, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Quản Lý Thu Chi Thông Minh',
    description: 'Theo dõi dòng tiền của bạn một cách dễ dàng với giao diện trực quan và cao cấp nhất.',
    image: require('../../assets/onboarding/5.png'),
    bgColors: ['#EEF2FF', '#E0E7FF']
  },
  {
    id: '2',
    title: 'Trợ Lý AI Phân Tích',
    description: 'Sử dụng trí tuệ nhân tạo để phân tích thói quen tiêu dùng và đưa ra lời khuyên cá nhân hóa.',
    image: require('../../assets/onboarding/3.png'),
    bgColors: ['#F3E8FF', '#EAEBFF']
  },
  {
    id: '3',
    title: 'Chinh Phục Mọi Mục Tiêu',
    description: 'Lập kế hoạch, theo dõi tiến độ và hiện thực hóa giấc mơ tài chính của bạn ngay hôm nay.',
    image: require('../../assets/onboarding/4.png'),
    bgColors: ['#FFF0F2', '#FFE4E6']
  }
];

export default function OnboardingScreen({ onFinish }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFinish();
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgWrapper}>
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: scrollX.interpolate({
              inputRange: slides.map((_, i) => i * width),
              outputRange: slides.map(s => s.bgColors[0]),
              extrapolate: 'clamp'
            })
          }
        ]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.FlatList
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false
          })}
          scrollEventThrottle={32}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />

        <View style={styles.bottomContainer}>
          <View style={styles.indicatorContainer}>
            {slides.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [10, 24, 10],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              const backgroundColor = scrollX.interpolate({
                inputRange,
                outputRange: ['#94A3B8', '#4F46E5', '#94A3B8'],
                extrapolate: 'clamp',
              });
              return <Animated.View style={[styles.dot, { width: dotWidth, opacity, backgroundColor }]} key={i.toString()} />;
            })}
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={scrollToNext} style={styles.btnWrap}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.btn}>
              <Text style={styles.btnText}>{currentIndex === slides.length - 1 ? "Bắt đầu ngay" : "Tiếp tục"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 20
  },
  imageContainer: {
    flex: 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20
  },
  image: {
    width: width * 0.9,
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 15 },
    shadowRadius: 20,
  },
  textContainer: {
    flex: 0.35,
    paddingHorizontal: 35,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: -0.5
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  btnWrap: {
    borderRadius: 30,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 8
  },
  btn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});
